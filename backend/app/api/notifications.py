from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.entities import Notification, User
from app.schemas.common import NotificationOut

router=APIRouter(prefix="/notifications",tags=["notifications"])

@router.get("",response_model=list[NotificationOut])
async def list_notifications(user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    return list((await db.scalars(select(Notification).where(Notification.user_id==user.id).order_by(Notification.created_at.desc()))).all())

@router.patch("/read-all",response_model=dict)
async def read_all(user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    await db.execute(update(Notification).where(Notification.user_id==user.id).values(is_read=True));await db.commit();return {"ok":True}

@router.patch("/{notification_id}/read",response_model=NotificationOut)
async def read_one(notification_id:UUID,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    x=await db.scalar(select(Notification).where(Notification.id==notification_id,Notification.user_id==user.id))
    if not x:raise HTTPException(404,"Уведомление не найдено")
    x.is_read=True;await db.commit();await db.refresh(x);return x
