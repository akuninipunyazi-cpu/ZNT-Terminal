import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User, Payment, Subscription
from app.schemas.auth import AccountSetupRequest, TokenResponse
from app.services.session_service import SessionService


class AuthService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
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
        # 1. Cari payment berdasarkan setup_token dan pastikan belum dipakai
        query = select(Payment).where(
            Payment.setup_token == payload.setup_token,
            Payment.email == payload.email,
            Payment.setup_token_used == False,
        )
        result = await self.db.execute(query)
        payment = result.scalar_one_or_none()

        if not payment:
            # Di mode local dev, agar mempermudah testing tanpa payment asli, kita ijinkan register langsung
            if self.settings.app_env == "local" and payload.setup_token == "dev-token":
                pass
            else:
                raise ValueError("Invalid or expired setup token")

        # 2. Cek apakah email/username sudah dipakai
        user_check_query = select(User).where(
            (User.email == payload.email) | (User.username == payload.username)
        )
        user_check_result = await self.db.execute(user_check_query)
        if user_check_result.scalar_one_or_none():
            raise ValueError("Email or username already exists")

        # 3. Create User
        password_hash = hash_password(payload.password)
        new_user = User(
            name=payload.name,
            email=payload.email,
            username=payload.username,
            password_hash=password_hash,
        )
        self.db.add(new_user)
        await self.db.flush()  # Agar dapet new_user.id

        # 4. Create Subscription
        new_sub = Subscription(
            user_id=new_user.id,
            plan_code="znt-premium-monthly",
            status="active",
        )
        self.db.add(new_sub)

        # 5. Tandai setup_token sudah digunakan
        if payment:
            payment.setup_token_used = True

        # Commit ke PostgreSQL
        await self.db.commit()

        # Cache preview di Redis untuk monitoring (opsional)
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
        # Coba query user berdasarkan email atau username
        query = select(User).where((User.email == identifier) | (User.username == identifier))
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if user and verify_password(password, user.password_hash):
            return {"id": str(user.id), "username": user.username}

        # Backup: ijinkan login demo untuk local dev
        if self.settings.app_env == "local" and identifier in {"demo", "demo@znt.local"}:
            if password == "demo12345":
                return {"id": "dev-user", "username": "demo"}

        raise ValueError("Invalid credentials")
