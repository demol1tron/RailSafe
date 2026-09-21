from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import require_roles
from app.core.database import get_db
from app.models.entities import Incident, IncidentStatus, UserRole

router=APIRouter(prefix="/statistics",tags=["statistics"])
allowed=require_roles(UserRole.ADMIN,UserRole.DISPATCHER,UserRole.INSPECTOR)

@router.get("/summary")
async def summary(_=Depends(allowed),db:AsyncSession=Depends(get_db)):
    total=int(await db.scalar(select(func.count()).select_from(Incident)) or 0)
    status_rows=(await db.execute(select(Incident.status,func.count()).group_by(Incident.status))).all()
    severity_rows=(await db.execute(select(Incident.severity,func.count()).group_by(Incident.severity))).all()
    category_rows=(await db.execute(select(Incident.category_id,func.count()).group_by(Incident.category_id))).all()
    return {"total":total,"by_status":{k.value:v for k,v in status_rows},"by_severity":{k.value:v for k,v in severity_rows},"by_category":{str(k):v for k,v in category_rows}}

@router.get("/by-period")
async def by_period(date_from:datetime|None=Query(None,alias="from"),date_to:datetime|None=Query(None,alias="to"),group_by:str="day",_=Depends(allowed),db:AsyncSession=Depends(get_db)):
    unit={"day":"day","week":"week","month":"month"}.get(group_by,"day")
    bucket=func.date_trunc(unit,Incident.occurred_at)
    q=select(bucket.label("period"),func.count().label("count"))
    if date_from:q=q.where(Incident.occurred_at>=date_from)
    if date_to:q=q.where(Incident.occurred_at<=date_to)
    rows=(await db.execute(q.group_by(bucket).order_by(bucket))).all()
    return [{"period":p,"count":c} for p,c in rows]
