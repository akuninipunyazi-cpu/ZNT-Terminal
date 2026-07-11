from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.redis import get_redis_client
from app.schemas.auth import AccountSetupRequest, AccountSetupResponse, LoginRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db_session),
    redis: Redis = Depends(get_redis_client),
) -> TokenResponse:
    service = AuthService(db, redis)

    try:
        return await service.login(payload.identifier, payload.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


@router.post("/setup-account", response_model=AccountSetupResponse)
async def setup_account(
    payload: AccountSetupRequest,
    db: AsyncSession = Depends(get_db_session),
    redis: Redis = Depends(get_redis_client),
) -> AccountSetupResponse:
    service = AuthService(db, redis)
    try:
        await service.setup_account(payload)
        return AccountSetupResponse(status="created")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
