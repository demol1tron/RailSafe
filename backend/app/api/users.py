from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import require_roles
from app.core.database import get_db
from app.core.security import hash_password
from app.models.entities import User, UserRole
from app.schemas.common import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])
admin = require_roles(UserRole.ADMIN)

@router.get("", response_model=list[UserOut])
async def list_users(page:int=1,size:int=Query(20,le=100),role:UserRole|None=None,_=Depends(admin),db:AsyncSession=Depends(get_db)):
    q=select(User).order_by(User.created_at.desc()).offset((page-1)*size).limit(size)
    if role: q=q.where(User.role==role)
    return list((await db.scalars(q)).all())

@router.post("", response_model=UserOut, status_code=201)
async def create_user(data:UserCreate,_=Depends(admin),db:AsyncSession=Depends(get_db)):
    if data.role==UserRole.ADMIN: raise HTTPException(400,"Роль администратора нельзя создать через API")
    if await db.scalar(select(User).where(User.email==data.email.lower())): raise HTTPException(409,"Email уже используется")
    u=User(email=data.email.lower(),password_hash=hash_password(data.password),full_name=data.full_name,phone=data.phone,role=data.role)
    db.add(u); await db.commit(); await db.refresh(u); return u

@router.get("/inspectors/list", response_model=list[UserOut])
async def list_inspectors(_=Depends(require_roles(UserRole.ADMIN,UserRole.DISPATCHER)),db:AsyncSession=Depends(get_db)):
    return list((await db.scalars(select(User).where(User.role==UserRole.INSPECTOR,User.is_active.is_(True)).order_by(User.full_name))).all())

@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id:UUID,_=Depends(admin),db:AsyncSession=Depends(get_db)):
    u=await db.get(User,user_id)
    if not u: raise HTTPException(404,"Пользователь не найден")
    return u

@router.put("/{user_id}", response_model=UserOut)
async def update_user(user_id:UUID,data:UserUpdate,_=Depends(admin),db:AsyncSession=Depends(get_db)):
    u=await db.get(User,user_id)
    if not u: raise HTTPException(404,"Пользователь не найден")
    if data.role==UserRole.ADMIN and u.role!=UserRole.ADMIN: raise HTTPException(400,"Назначение роли администратора через API запрещено")
    for k,v in data.model_dump(exclude_unset=True).items(): setattr(u,k,v)
    await db.commit(); await db.refresh(u); return u

@router.patch("/{user_id}/deactivate", response_model=UserOut)
async def deactivate(user_id:UUID,_=Depends(admin),db:AsyncSession=Depends(get_db)):
    u=await db.get(User,user_id)
    if not u: raise HTTPException(404,"Пользователь не найден")
    u.is_active=False; await db.commit(); await db.refresh(u); return u

@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id:UUID,_=Depends(admin),db:AsyncSession=Depends(get_db)):
    from app.models.entities import Incident
    u=await db.get(User,user_id)
    if not u: raise HTTPException(404,"Пользователь не найден")
    count=await db.scalar(select(func.count()).select_from(Incident).where((Incident.reported_by_id==user_id)|(Incident.assigned_to_id==user_id)))
    if count: raise HTTPException(409,"У пользователя есть связанные инциденты")
    await db.delete(u); await db.commit()
