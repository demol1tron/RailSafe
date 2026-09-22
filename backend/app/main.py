import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, incidents, logs, notifications, profile, references, statistics, users
from app.core.audit import write_audit_log
from app.core.config import settings

app = FastAPI(
    title="RailSafe API",
    version="1.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [
    auth.router,
    users.router,
    references.router,
    incidents.router,
    notifications.router,
    statistics.router,
    profile.router,
    logs.router,
]:
    app.include_router(router, prefix="/api")


@app.middleware("http")
async def security_and_audit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if request.headers.get("X-Requested-With") != "XMLHttpRequest":
            response = JSONResponse(
                status_code=403,
                content={"detail": "Требуется заголовок X-Requested-With"},
            )
            await write_audit_log(request, response.status_code)
            return response

    try:
        response = await call_next(request)
    except Exception:
        await write_audit_log(request, 500)
        raise

    await write_audit_log(request, response.status_code)
    return response


@app.get("/api/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "RailSafe"}


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logging.exception(
        "Unhandled error: %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера"},
    )
