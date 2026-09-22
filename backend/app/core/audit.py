import logging

from fastapi import Request

from app.core.database import SessionLocal
from app.models.entities import AuditLog

logger = logging.getLogger(__name__)

_SKIP_PATHS = {
    "/api/health",
    "/api/docs",
    "/api/openapi.json",
}


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()[:64]
    if request.client:
        return request.client.host[:64]
    return None


async def write_audit_log(request: Request, status_code: int) -> None:
    path = request.url.path
    if not path.startswith("/api/") or path in _SKIP_PATHS:
        return

    actor_id = getattr(request.state, "audit_user_id", None)
    actor_email = getattr(request.state, "audit_actor_email", None)
    query_string = request.url.query[:1000] if request.url.query else None

    try:
        async with SessionLocal() as db:
            db.add(
                AuditLog(
                    actor_id=actor_id,
                    actor_email=actor_email,
                    action=f"{request.method} {path}",
                    method=request.method[:10],
                    path=path[:500],
                    query_string=query_string,
                    status_code=status_code,
                    ip_address=_client_ip(request),
                    user_agent=(request.headers.get("user-agent") or "")[:255] or None,
                )
            )
            await db.commit()
    except Exception:
        # Audit logging must never turn a successful business request into 500.
        logger.exception("Не удалось записать audit log")
