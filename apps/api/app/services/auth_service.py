from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.schemas.auth import AccountSetupRequest, TokenResponse
from app.services.session_service import SessionService


class AuthService:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.sessions = SessionService(redis)
        self.settings = get_settings()

    async def login(self, identifier: str, password: str) -> TokenResponse:
        user = await self._authenticate_user(identifier, password)
        try:
            session_id = await self.sessions.start_session(user_id=user["id"])
        except RedisError:
            if self.settings.app_env != "local":
                raise
            session_id = "dev-local-session"

        token = create_access_token(
            user_id=user["id"],
            session_id=session_id,
            username=user["username"],
        )
        return TokenResponse(access_token=token, session_id=session_id)

    async def setup_account(self, payload: AccountSetupRequest) -> None:
        # This is intentionally a service boundary. The next step is to persist
        # verified paid accounts in PostgreSQL after Midtrans webhook success.
        password_hash = hash_password(payload.password)
        try:
            await self.redis.hset(
                f"auth:setup-preview:{payload.username}",
                mapping={
                    "name": payload.name,
                    "email": payload.email,
                    "username": payload.username,
                    "password_hash": password_hash,
                    "setup_token": payload.setup_token,
                },
            )
        except RedisError:
            if self.settings.app_env != "local":
                raise

    async def _authenticate_user(self, identifier: str, password: str) -> dict[str, str]:
        if self.settings.app_env == "local" and identifier in {"demo", "demo@znt.local"}:
            if password == "demo12345":
                return {"id": "dev-user", "username": "demo"}

        raise ValueError("Invalid credentials")
