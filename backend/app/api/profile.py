from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.entities import RefreshToken, User
from app.schemas.common import UserOut, _normalize_full_name, _normalize_phone

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_full_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        return _normalize_phone(value)


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)


@router.put("", response_model=UserOut)
async def update_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/password", status_code=204)
async def change_password(
    data: PasswordChange,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(400, "Текущий пароль неверен")
    user.password_hash = hash_password(data.new_password)
    await db.execute(
        update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked=True)
    )
    await db.commit()
