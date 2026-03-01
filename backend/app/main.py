import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.middleware import SecurityHeadersMiddleware
from app.rate_limit import limiter
from app.routers import admin, auth, cases, documents, chat

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.vector_store import init_collection

    await init_collection()
    yield


app = FastAPI(title="CounselAI", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)

app.include_router(admin.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health")
async def health():
    return {"status": "ok"}
