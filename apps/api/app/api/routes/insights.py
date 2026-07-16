from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db_session
from app.core.security import decode_access_token
from app.models.insight import MarketUpdate, EconomyOutlook, TradeIdea
from app.schemas.insight import (
    MarketUpdateCreate,
    MarketUpdateResponse,
    EconomyOutlookCreate,
    EconomyOutlookResponse,
    TradeIdeaCreate,
    TradeIdeaResponse,
)

router = APIRouter()
security = HTTPBearer()

# ── Security Dependencies ───────────────────────────────────────────────────

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    try:
        return decode_access_token(credentials.credentials)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    # Basic role check: username must be 'admin'
    if current_user.get("username") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )
    return current_user


# ── Market Updates Endpoints ────────────────────────────────────────────────

@router.post("/market-updates", response_model=MarketUpdateResponse, status_code=status.HTTP_201_CREATED)
async def create_market_update(
    payload: MarketUpdateCreate,
    db: AsyncSession = Depends(get_db_session),
    _admin: dict = Depends(get_admin_user),
) -> MarketUpdate:
    update = MarketUpdate(ticker=payload.ticker.upper(), reason=payload.reason)
    db.add(update)
    await db.commit()
    await db.refresh(update)
    return update


@router.get("/market-updates", response_model=List[MarketUpdateResponse])
async def list_market_updates(
    db: AsyncSession = Depends(get_db_session),
    _user: dict = Depends(get_current_user),
) -> List[MarketUpdate]:
    query = select(MarketUpdate).order_by(MarketUpdate.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


# ── Economy Outlooks Endpoints ──────────────────────────────────────────────

@router.post("/economy-outlooks", response_model=EconomyOutlookResponse, status_code=status.HTTP_201_CREATED)
async def create_economy_outlook(
    payload: EconomyOutlookCreate,
    db: AsyncSession = Depends(get_db_session),
    _admin: dict = Depends(get_admin_user),
) -> EconomyOutlook:
    outlook = EconomyOutlook(indicator=payload.indicator.upper(), explanation=payload.explanation)
    db.add(outlook)
    await db.commit()
    await db.refresh(outlook)
    return outlook


@router.get("/economy-outlooks", response_model=List[EconomyOutlookResponse])
async def list_economy_outlooks(
    db: AsyncSession = Depends(get_db_session),
    _user: dict = Depends(get_current_user),
) -> List[EconomyOutlook]:
    query = select(EconomyOutlook).order_by(EconomyOutlook.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


# ── Trade Ideas Endpoints ───────────────────────────────────────────────────

@router.post("/trade-ideas", response_model=TradeIdeaResponse, status_code=status.HTTP_201_CREATED)
async def create_trade_idea(
    payload: TradeIdeaCreate,
    db: AsyncSession = Depends(get_db_session),
    _admin: dict = Depends(get_admin_user),
) -> TradeIdea:
    idea = TradeIdea(
        ticker=payload.ticker.upper(),
        direction=payload.direction.upper(),
        trade_type=payload.trade_type,
        entry_price=payload.entry_price,
        tp_levels=payload.tp_levels,
        sl=payload.sl,
        rr=payload.rr,
        reason=payload.reason,
        chart_url=payload.chart_url,
    )
    db.add(idea)
    await db.commit()
    await db.refresh(idea)
    return idea


@router.get("/trade-ideas", response_model=List[TradeIdeaResponse])
async def list_trade_ideas(
    db: AsyncSession = Depends(get_db_session),
    _user: dict = Depends(get_current_user),
) -> List[TradeIdea]:
    query = select(TradeIdea).order_by(TradeIdea.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())
