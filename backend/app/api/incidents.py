from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.labels import status_label
from app.models.entities import (Incident, IncidentCategory, IncidentComment, IncidentSeverity,
    IncidentStatus, IncidentStatusHistory, Notification, User, UserRole)
from app.schemas.common import (AssignIn, CommentIn, CommentOut, HistoryOut, IncidentCreate,
    IncidentListOut, IncidentMapOut, IncidentOut, IncidentUpdate, StatusIn)
from app.services.access import can_edit_incident, ensure_incident_access
from app.services.statuses import transition_allowed

router = APIRouter(prefix="/incidents", tags=["incidents"])

def visible_query(user: User):
    q = select(Incident)
    if user.role == UserRole.EMPLOYEE:
        q = q.where(Incident.reported_by_id == user.id)
    elif user.role == UserRole.INSPECTOR:
        q = q.where(Incident.assigned_to_id == user.id)
    return q

async def get_incident_or_404(db: AsyncSession, incident_id: UUID) -> Incident:
    incident = await db.scalar(select(Incident).where(Incident.id == incident_id))
    if not incident:
        raise HTTPException(404, "Инцидент не найден")
    return incident

@router.get("", response_model=IncidentListOut)
async def list_incidents(page:int=1, size:int=Query(20,ge=1,le=100), status:IncidentStatus|None=None,
    severity:IncidentSeverity|None=None, category_id:UUID|None=None, station_id:UUID|None=None,
    date_from:datetime|None=None, date_to:datetime|None=None, sort:str="created_at_desc",
    user:User=Depends(get_current_user), db:AsyncSession=Depends(get_db)):
    q=visible_query(user)
    filters=[]
    if status: filters.append(Incident.status==status)
    if severity: filters.append(Incident.severity==severity)
    if category_id: filters.append(Incident.category_id==category_id)
    if station_id: filters.append(Incident.station_id==station_id)
    if date_from: filters.append(Incident.occurred_at>=date_from)
    if date_to: filters.append(Incident.occurred_at<=date_to)
    if filters: q=q.where(*filters)
    count_q=select(func.count()).select_from(q.order_by(None).subquery())
    total=int(await db.scalar(count_q) or 0)
    order = Incident.created_at.asc() if sort=="created_at_asc" else Incident.created_at.desc()
    items=list((await db.scalars(q.order_by(order).offset((page-1)*size).limit(size))).all())
    return IncidentListOut(items=items,total=total,page=page,size=size)

@router.get("/map", response_model=list[IncidentMapOut])
async def map_incidents(status:IncidentStatus|None=None,severity:IncidentSeverity|None=None,category_id:UUID|None=None,
    user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    q=visible_query(user).options(selectinload(Incident.category))
    if status:q=q.where(Incident.status==status)
    if severity:q=q.where(Incident.severity==severity)
    if category_id:q=q.where(Incident.category_id==category_id)
    items=(await db.scalars(q)).all()
    return [IncidentMapOut(id=x.id,latitude=x.latitude,longitude=x.longitude,severity=x.severity,status=x.status,title=x.title,category=x.category.name) for x in items]

@router.post("", response_model=IncidentOut, status_code=201)
async def create_incident(data:IncidentCreate,user:User=Depends(require_roles(UserRole.ADMIN,UserRole.DISPATCHER,UserRole.EMPLOYEE)),db:AsyncSession=Depends(get_db)):
    if not await db.get(IncidentCategory,data.category_id): raise HTTPException(400,"Категория не существует")
    incident=Incident(**data.model_dump(),reported_by_id=user.id,status=IncidentStatus.NEW)
    db.add(incident); await db.flush()
    db.add(IncidentStatusHistory(incident_id=incident.id,old_status=None,new_status=IncidentStatus.NEW.value,changed_by_id=user.id,comment="Инцидент зарегистрирован"))
    await db.commit(); await db.refresh(incident); return incident

@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(incident_id:UUID,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    incident=await get_incident_or_404(db,incident_id);ensure_incident_access(incident,user);return incident

@router.put("/{incident_id}", response_model=IncidentOut)
async def update_incident(incident_id:UUID,data:IncidentUpdate,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    incident=await get_incident_or_404(db,incident_id)
    if not can_edit_incident(incident,user): raise HTTPException(403,"Редактирование запрещено")
    for k,v in data.model_dump(exclude_unset=True).items(): setattr(incident,k,v)
    await db.commit();await db.refresh(incident);return incident

@router.delete("/{incident_id}", status_code=204)
async def delete_incident(incident_id:UUID,_:User=Depends(require_roles(UserRole.ADMIN)),db:AsyncSession=Depends(get_db)):
    incident=await get_incident_or_404(db,incident_id);await db.delete(incident);await db.commit()

@router.patch("/{incident_id}/assign", response_model=IncidentOut)
async def assign(incident_id:UUID,data:AssignIn,user:User=Depends(require_roles(UserRole.ADMIN,UserRole.DISPATCHER)),db:AsyncSession=Depends(get_db)):
    incident=await get_incident_or_404(db,incident_id)
    inspector=await db.get(User,data.assigned_to_id)
    if not inspector or inspector.role!=UserRole.INSPECTOR or not inspector.is_active: raise HTTPException(400,"Назначить можно только активного инспектора")
    old=incident.status
    incident.assigned_to_id=inspector.id
    if incident.status==IncidentStatus.NEW: incident.status=IncidentStatus.ASSIGNED
    if old!=incident.status:
        db.add(IncidentStatusHistory(incident_id=incident.id,old_status=old.value,new_status=incident.status.value,changed_by_id=user.id,comment="Назначен инспектор"))
    db.add(Notification(user_id=inspector.id,incident_id=incident.id,message=f"Вам назначен инцидент: {incident.title}"))
    await db.commit();await db.refresh(incident);return incident

@router.patch("/{incident_id}/status", response_model=IncidentOut)
async def change_status(incident_id:UUID,data:StatusIn,user:User=Depends(require_roles(UserRole.ADMIN,UserRole.DISPATCHER,UserRole.INSPECTOR)),db:AsyncSession=Depends(get_db)):
    incident=await get_incident_or_404(db,incident_id)
    if user.role==UserRole.INSPECTOR and incident.assigned_to_id!=user.id: raise HTTPException(403,"Можно менять статус только назначенных вам инцидентов")
    if not transition_allowed(incident.status,data.new_status): raise HTTPException(400, f"Недопустимый переход: {status_label(incident.status)} → {status_label(data.new_status)}")
    old=incident.status;incident.status=data.new_status
    db.add(IncidentStatusHistory(incident_id=incident.id,old_status=old.value,new_status=data.new_status.value,changed_by_id=user.id,comment=data.comment))
    recipients={incident.reported_by_id}
    if incident.assigned_to_id:recipients.add(incident.assigned_to_id)
    recipients.discard(user.id)
    for uid in recipients: db.add(Notification(user_id=uid,incident_id=incident.id,message=f"Статус инцидента «{incident.title}» изменён: {status_label(data.new_status)}"))
    await db.commit();await db.refresh(incident);return incident

@router.get("/{incident_id}/history", response_model=list[HistoryOut])
async def history(incident_id:UUID,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    incident=await get_incident_or_404(db,incident_id);ensure_incident_access(incident,user)
    return list((await db.scalars(select(IncidentStatusHistory).where(IncidentStatusHistory.incident_id==incident_id).order_by(IncidentStatusHistory.changed_at))).all())

@router.get("/{incident_id}/comments", response_model=list[CommentOut])
async def comments(incident_id:UUID,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    incident=await get_incident_or_404(db,incident_id);ensure_incident_access(incident,user)
    return list((await db.scalars(select(IncidentComment).where(IncidentComment.incident_id==incident_id).order_by(IncidentComment.created_at))).all())

@router.post("/{incident_id}/comments", response_model=CommentOut, status_code=201)
async def add_comment(incident_id:UUID,data:CommentIn,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    incident=await get_incident_or_404(db,incident_id);ensure_incident_access(incident,user)
    x=IncidentComment(incident_id=incident_id,user_id=user.id,text=data.text);db.add(x);await db.commit();await db.refresh(x);return x
