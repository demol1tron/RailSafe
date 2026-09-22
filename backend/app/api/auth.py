import logging
import uuid
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jose import JWTError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.mailer import send_2fa_code
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.core.two_factor import generate_otp, hash_otp, verify_otp
from app.models.entities import RefreshToken, TwoFactorChallenge, User, UserRole
from app.schemas.common import LoginIn, LoginOut, RegisterIn, TokenOut, TwoFactorVerifyIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE_NAME = "railsafe_refresh"
logger = logging.getLogger(__name__)


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=settings.refresh_token_days * 86400,
        path="/api/auth",
    )


def _set_audit_actor(request: Request, user: User) -> None:
    request.state.audit_user_id = user.id
    request.state.audit_actor_email = user.email


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()[:64]
    return request.client.host[:64] if request.client else None


async def _issue_session(
    user: User,
    request: Request,
    response: Response,
    db: AsyncSession,
) -> TokenOut:
    refresh, exp = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh),
            expires_at=exp,
            user_agent=request.headers.get("user-agent"),
        )
    )
    await db.commit()
    set_refresh_cookie(response, refresh)
    return TokenOut(access_token=create_access_token(user.id, user.role.value))


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: RegisterIn, request: Request, db: AsyncSession = Depends(get_db)):
    if await db.scalar(select(User).where(User.email == data.email.lower())):
        raise HTTPException(409, "Пользователь с таким email уже существует")
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.EMPLOYEE,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    _set_audit_actor(request, user)
    return user


@router.post("/login", response_model=LoginOut)
async def login(
    data: LoginIn,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not user.is_active or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Неверный email или пароль")

    _set_audit_actor(request, user)

    if not settings.two_factor_enabled or user.role == UserRole.ADMIN:
        token = await _issue_session(user, request, response, db)
        return LoginOut(access_token=token.access_token)

    challenge_id = uuid.uuid4()
    code = generate_otp()
    now = datetime.now(timezone.utc)

    # Previous unused codes become invalid as soon as a new login starts.
    await db.execute(
        update(TwoFactorChallenge)
        .where(
            TwoFactorChallenge.user_id == user.id,
            TwoFactorChallenge.consumed.is_(False),
        )
        .values(consumed=True)
    )

    challenge = TwoFactorChallenge(
        id=challenge_id,
        user_id=user.id,
        code_hash=hash_otp(challenge_id, code),
        expires_at=now + timedelta(seconds=settings.two_factor_ttl_seconds),
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(challenge)
    await db.flush()

    try:
        await send_2fa_code(user.email, code)
    except Exception as exc:
        await db.rollback()
        logger.exception("Не удалось отправить 2FA-код")
        raise HTTPException(503, "Не удалось отправить код подтверждения. Проверьте SMTP-настройки.") from exc

    await db.commit()
    return LoginOut(
        requires_2fa=True,
        challenge_id=challenge.id,
        expires_in=settings.two_factor_ttl_seconds,
    )


@router.post("/2fa/verify", response_model=TokenOut)
async def verify_two_factor(
    data: TwoFactorVerifyIn,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    challenge = await db.scalar(
        select(TwoFactorChallenge)
        .where(TwoFactorChallenge.id == data.challenge_id)
        .with_for_update()
    )
    if not challenge:
        raise HTTPException(401, "Код подтверждения недействителен")

    user = await db.get(User, challenge.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Пользователь недоступен")
    _set_audit_actor(request, user)

    now = datetime.now(timezone.utc)
    if challenge.consumed or challenge.expires_at <= now:
        raise HTTPException(401, "Код подтверждения истёк или уже использован")
    if challenge.attempts >= settings.two_factor_max_attempts:
        challenge.consumed = True
        await db.commit()
        raise HTTPException(401, "Превышено количество попыток. Выполните вход заново.")

    if not verify_otp(challenge.id, data.code, challenge.code_hash):
        challenge.attempts += 1
        if challenge.attempts >= settings.two_factor_max_attempts:
            challenge.consumed = True
        await db.commit()
        raise HTTPException(401, "Неверный код подтверждения")

    challenge.consumed = True
    refresh, exp = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh),
            expires_at=exp,
            user_agent=request.headers.get("user-agent"),
        )
    )
    await db.commit()
    set_refresh_cookie(response, refresh)
    return TokenOut(access_token=create_access_token(user.id, user.role.value))


@router.post("/refresh", response_model=TokenOut)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        raise HTTPException(401, "Refresh token отсутствует")
    try:
        payload = decode_refresh_token(raw)
    except JWTError:
        raise HTTPException(401, "Недействительный refresh token")

    stored = await db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_token(raw),
            RefreshToken.revoked.is_(False),
        )
    )
    if not stored or stored.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(401, "Refresh token отозван или истёк")

    user = await db.scalar(
        select(User).where(User.id == UUID(payload["sub"]), User.is_active.is_(True))
    )
    if not user:
        raise HTTPException(401, "Пользователь недоступен")
    _set_audit_actor(request, user)

    stored.revoked = True
    new_refresh, exp = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(new_refresh),
            expires_at=exp,
            user_agent=request.headers.get("user-agent"),
        )
    )
    await db.commit()
    set_refresh_cookie(response, new_refresh)
    return TokenOut(access_token=create_access_token(user.id, user.role.value))


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw = request.cookies.get(COOKIE_NAME)
    if raw:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == hash_token(raw))
            .values(revoked=True)
        )
        await db.commit()
    response.delete_cookie(COOKIE_NAME, path="/api/auth")


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
