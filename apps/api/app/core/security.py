from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(
    *,
    user_id: str,
    session_id: str,
    username: str,
    minutes: int | None = None,
) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(
        minutes=minutes or settings.jwt_access_token_minutes
    )
    payload: dict[str, Any] = {
        "iss": settings.jwt_issuer,
        "sub": user_id,
        "sid": session_id,
        "username": username,
        "exp": expires_at,
    }

    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()

    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
        )
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
