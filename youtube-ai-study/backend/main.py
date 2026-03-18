import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Allow `uvicorn main:app` from inside backend without requiring PYTHONPATH.
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(_backend_dir)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from backend.config import get_settings
from backend.routes.video_routes import router as video_router
from backend.routes.qa_routes import router as qa_router
from backend.routes.lessons_routes import router as lessons_router
from backend.routes.pdf_routes import router as pdf_router
from backend.routes.knowledge_routes import router as knowledge_router
from backend.routes.assistant_routes import router as assistant_router
from backend.app.modules.learning.routers import router as learning_router
from backend.utils.security import SimpleRateLimiter, get_client_ip


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: FastAPI, settings) -> None:
        super().__init__(app)
        self.settings = settings
        self.limiter = SimpleRateLimiter(settings.rate_limit_per_minute, 60)
        self.public_paths = {"/health", "/docs", "/openapi.json"}

    async def dispatch(self, request, call_next):
        path = request.url.path
        if path not in self.public_paths:
            if self.settings.internal_api_key:
                provided = request.headers.get("x-internal-api-key", "")
                if provided != self.settings.internal_api_key:
                    return JSONResponse({"detail": "Unauthorized"}, status_code=401)

            client_ip = get_client_ip(request)
            rate_key = f"{client_ip}:{path}"
            if not self.limiter.allow(rate_key):
                return JSONResponse({"detail": "Too many requests"}, status_code=429)

        if request.method in {"POST", "PUT", "PATCH"}:
            content_length = request.headers.get("content-length")
            if content_length and content_length.isdigit():
                if int(content_length) > self.settings.max_request_bytes:
                    return JSONResponse({"detail": "Request too large"}, status_code=413)

        return await call_next(request)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="YouTube AI Study Backend",
        version="1.0.0",
        description="Backend service for turning YouTube videos into structured learning material with RAG QA.",
    )

    # CORS – allow frontend (Vercel) and local dev by default
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Internal-API-Key", "X-User-Id"],
    )
    app.add_middleware(SecurityMiddleware, settings=settings)

    # Routers
    app.include_router(video_router, prefix="/api/video", tags=["video"])
    app.include_router(qa_router, prefix="/api/qa", tags=["qa"])
    app.include_router(lessons_router, prefix="/api/lessons", tags=["lessons"])
    app.include_router(pdf_router, prefix="/api/pdf", tags=["pdf"])
    app.include_router(knowledge_router, prefix="/api/knowledge", tags=["knowledge"])
    app.include_router(assistant_router, prefix="/api/assistant", tags=["assistant"])
    app.include_router(learning_router, prefix="/api", tags=["learning"])

    # Static file serving for generated PDFs
    app.mount(
        "/static",
        StaticFiles(directory=settings.pdf_output_dir),
        name="static",
    )

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()

