from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.entities import AuditLog, User, UserRole
from app.schemas.common import AuditLogListOut

router = APIRouter(prefix="/logs", tags=["audit"])
admin = require_roles(UserRole.ADMIN)


@router.get("", response_model=AuditLogListOut)
async def list_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    method: str | None = None,
    status_code: int | None = None,
    actor_id: UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = Query(default=None, max_length=200),
    _: User = Depends(admin),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if method:
        filters.append(AuditLog.method == method.upper())
    if status_code is not None:
        filters.append(AuditLog.status_code == status_code)
    if actor_id:
        filters.append(AuditLog.actor_id == actor_id)
    if date_from:
        filters.append(AuditLog.created_at >= date_from)
    if date_to:
        filters.append(AuditLog.created_at <= date_to)
    if search:
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                AuditLog.actor_email.ilike(pattern),
                AuditLog.path.ilike(pattern),
                AuditLog.action.ilike(pattern),
                AuditLog.ip_address.ilike(pattern),
            )
        )

    q = select(AuditLog)
    count_q = select(func.count()).select_from(AuditLog)
    if filters:
        q = q.where(*filters)
        count_q = count_q.where(*filters)

    total = int(await db.scalar(count_q) or 0)
    items = list(
        (
            await db.scalars(
                q.order_by(AuditLog.created_at.desc())
                .offset((page - 1) * size)
                .limit(size)
            )
        ).all()
    )
    return AuditLogListOut(items=items, total=total, page=page, size=size)
