from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    app_name: str = "ZNT Terminal"

    database_url: str = "postgresql+asyncpg://znt:znt@localhost:5432/znt_terminal"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-this-before-production"
    jwt_issuer: str = "znt-terminal"
    jwt_access_token_minutes: int = 30

    midtrans_server_key: str = "change-this"
    midtrans_client_key: str = "change-this"
    midtrans_is_production: bool = False

    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
    )
    cors_origin_regex: str | None = r"^http://(localhost|127\.0\.0\.1):30\d{2}$"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
