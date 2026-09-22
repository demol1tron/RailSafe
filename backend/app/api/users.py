from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.security import hash_password
from app.models.entities import (
    Incident,
    IncidentComment,
    IncidentStatusHistory,
    RefreshToken,
    User,
    UserRole,
)
from app.schemas.common import UserCreate, UserOut, UserStatusUpdate, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])
admin = require_roles(UserRole.ADMIN)


@router.get("", response_model=list[UserOut])
async def list_users(
    page: int = 1,
    size: int = Query(20, le=100),
    role: UserRole | None = None,
    _: User = Depends(admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(User).order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
    if role:
        q = q.where(User.role == role)
    return list((await db.scalars(q)).all())


@router.post("", response_model=UserOut, status_code=201)
async def create_user(
    data: UserCreate,
    _: User = Depends(admin),
    db: AsyncSession = Depends(get_db),
):
    if data.role == UserRole.ADMIN:
        raise HTTPException(400, "Роль администратора нельзя создать через API")
    if await db.scalar(select(User).where(User.email == data.email.lower())):
        raise HTTPException(409, "Email уже используется")
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/inspectors/list", response_model=list[UserOut])
async def list_inspectors(
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    db: AsyncSession = Depends(get_db),
):
    return list(
        (
            await db.scalars(
                select(User)
                .where(User.role == UserRole.INSPECTOR, User.is_active.is_(True))
                .order_by(User.full_name)
            )
        ).all()
    )


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: UUID,
    _: User = Depends(admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    return user


@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    _: User = Depends(admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Пользователь не найден")

    if data.role is not None:
        if data.role == UserRole.ADMIN and user.role != UserRole.ADMIN:
            raise HTTPException(400, "Назначение роли администратора через API запрещено")
        if user.role == UserRole.ADMIN and data.role != UserRole.ADMIN:
            raise HTTPException(400, "Изменение роли администратора через API запрещено")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/status", response_model=UserOut)
async def set_user_status(
    user_id: UUID,
    data: UserStatusUpdate,
    current_admin: User = Depends(admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if user.id == current_admin.id and not data.is_active:
        raise HTTPException(400, "Нельзя заблокировать собственную учетную запись")
    if user.role == UserRole.ADMIN and not data.is_active:
        raise HTTPException(400, "Блокировка администратора через API запрещена")

    user.is_active = data.is_active
    if not data.is_active:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.revoked.is_(False))
            .values(revoked=True)
        )
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/deactivate", response_model=UserOut, deprecated=True)
async def deactivate(
    user_id: UUID,
    current_admin: User = Depends(admin),
    db: AsyncSession = Depends(get_db),
):
    """Обратная совместимость со старым frontend. Новый UI использует /status."""
    return await set_user_status(
        user_id,
        UserStatusUpdate(is_active=False),
        current_admin,
        db,
    )


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    current_admin: User = Depends(admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if user.id == current_admin.id:
        raise HTTPException(400, "Нельзя удалить собственную учетную запись")
    if user.role == UserRole.ADMIN:
        raise HTTPException(400, "Удаление администратора через API запрещено")

    incident_count = await db.scalar(
        select(func.count())
        .select_from(Incident)
        .where((Incident.reported_by_id == user_id) | (Incident.assigned_to_id == user_id))
    )
    comment_count = await db.scalar(
        select(func.count()).select_from(IncidentComment).where(IncidentComment.user_id == user_id)
    )
    history_count = await db.scalar(
        select(func.count())
        .select_from(IncidentStatusHistory)
        .where(IncidentStatusHistory.changed_by_id == user_id)
    )

    if incident_count or comment_count or history_count:
        raise HTTPException(
            409,
            "Нельзя удалить пользователя: с ним связаны инциденты, комментарии или записи истории статусов. Пользователя можно заблокировать.",
        )

    await db.delete(user)
    await db.commit()
