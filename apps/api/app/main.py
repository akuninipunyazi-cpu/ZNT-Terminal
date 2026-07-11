from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, payments, terminal, websocket
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="REST and WebSocket gateway for ZNT Terminal.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(payments.router, prefix="/payments", tags=["payments"])
    app.include_router(terminal.router, prefix="/terminal", tags=["terminal"])
    app.include_router(websocket.router, tags=["websocket"])

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "api"}

    return app


app = create_app()
