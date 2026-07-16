from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth, payments, terminal, websocket, insights
from app.core.config import get_settings
from app.core.database import engine
from app.models import Base


STATIC_DIR = Path("/app/static/charts")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the chart upload directory exists
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    # Initialise all database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield



def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="REST and WebSocket gateway for ZNT Terminal.",
        lifespan=lifespan,
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
    app.include_router(insights.router, prefix="/insights", tags=["insights"])
    app.include_router(websocket.router, tags=["websocket"])

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "api"}

    # Serve uploaded chart images at /static/charts/<filename>
    static_path = Path("/app/static")
    static_path.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

    return app


app = create_app()

