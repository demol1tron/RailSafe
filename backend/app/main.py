import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import auth, incidents, notifications, profile, references, statistics, users
from app.core.config import settings

app=FastAPI(title="RailSafe API",version="1.0.0",docs_url="/api/docs",openapi_url="/api/openapi.json")
app.add_middleware(CORSMiddleware,allow_origins=settings.cors_list,allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
for router in [auth.router,users.router,references.router,incidents.router,notifications.router,statistics.router,profile.router]:
    app.include_router(router,prefix="/api")


@app.middleware("http")
async def requested_with_guard(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if request.headers.get("X-Requested-With") != "XMLHttpRequest":
            return JSONResponse(status_code=403, content={"detail": "Требуется заголовок X-Requested-With"})
    return await call_next(request)

@app.get("/api/health",tags=["system"])
async def health(): return {"status":"ok","service":"RailSafe"}

@app.exception_handler(Exception)
async def unhandled(request:Request,exc:Exception):
    logging.exception("Unhandled error: %s %s",request.method,request.url.path,exc_info=exc)
    return JSONResponse(status_code=500,content={"detail":"Внутренняя ошибка сервера"})
