import uuid as _uuid
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Security, UploadFile, status
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

# Directory where uploaded chart images are stored (mounted as Docker volume)
UPLOAD_DIR = Path("/app/static/charts")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE_MB = 10


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
    if current_user.get("username") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )
    return current_user


# ── Image Upload Endpoint ───────────────────────────────────────────────────

@router.post("/upload-chart", status_code=status.HTTP_200_OK)
async def upload_chart_image(
    file: UploadFile = File(...),
    _admin: dict = Depends(get_admin_user),
) -> dict:
    """
    Upload a chart image (JPEG, PNG, WebP, GIF) and return its public URL.
    The returned URL is relative to the API base, e.g. /static/charts/uuid.png
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF.",
        )

    # Read file to check size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed: {MAX_FILE_SIZE_MB} MB.",
        )

    # Generate a unique filename preserving extension
    ext = Path(file.filename or "upload.jpg").suffix.lower() or ".jpg"
    filename = f"{_uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename

    dest.write_bytes(contents)

    return {"url": f"/static/charts/{filename}"}


# ── Market Updates Endpoints ────────────────────────────────────────────────

@router.post("/market-updates", response_model=MarketUpdateResponse, status_code=status.HTTP_201_CREATED)
async def create_market_update(
    payload: MarketUpdateCreate,
    db: AsyncSession = Depends(get_db_session),
    _admin: dict = Depends(get_admin_user),
) -> MarketUpdate:
    update = MarketUpdate(
        ticker=payload.ticker.upper(),
        reason=payload.reason,
        chart_url=payload.chart_url,
    )
    db.add(update)
    await db.commit()
    await db.refresh(update)
    return update


@router.get("/market-updates", response_model=List[MarketUpdateResponse])
async def list_market_updates(
    db: AsyncSession = Depends(get_db_session),
    _user: dict = Depends(get_current_user),
) -> List[MarketUpdate]:
    result = await db.execute(select(MarketUpdate).order_by(MarketUpdate.created_at.desc()))
    return list(result.scalars().all())


# ── Economy Outlooks Endpoints ──────────────────────────────────────────────

@router.post("/economy-outlooks", response_model=EconomyOutlookResponse, status_code=status.HTTP_201_CREATED)
async def create_economy_outlook(
    payload: EconomyOutlookCreate,
    db: AsyncSession = Depends(get_db_session),
    _admin: dict = Depends(get_admin_user),
) -> EconomyOutlook:
    outlook = EconomyOutlook(
        indicator=payload.indicator.upper(),
        explanation=payload.explanation,
        chart_url=payload.chart_url,
    )
    db.add(outlook)
    await db.commit()
    await db.refresh(outlook)
    return outlook


@router.get("/economy-outlooks", response_model=List[EconomyOutlookResponse])
async def list_economy_outlooks(
    db: AsyncSession = Depends(get_db_session),
    _user: dict = Depends(get_current_user),
) -> List[EconomyOutlook]:
    result = await db.execute(select(EconomyOutlook).order_by(EconomyOutlook.created_at.desc()))
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
    result = await db.execute(select(TradeIdea).order_by(TradeIdea.created_at.desc()))
    return list(result.scalars().all())


# ── DELETE Endpoints (Admin Only) ───────────────────────────────────────────

@router.delete("/market-updates/{id}", status_code=status.HTTP_200_OK)
async def delete_market_update(
    id: _uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    _admin: dict = Depends(get_admin_user),
) -> dict:
    result = await db.execute(select(MarketUpdate).where(MarketUpdate.id == id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market update not found")
    
    # Optional: Delete associated chart image if it exists in local UPLOAD_DIR
    if item.chart_url and item.chart_url.startswith("/static/charts/"):
        filename = item.chart_url.split("/")[-1]
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass  # Fail silently to avoid breaking delete flow if file not found

    await db.delete(item)
    await db.commit()
    return {"message": "Market update deleted successfully"}


@router.delete("/economy-outlooks/{id}", status_code=status.HTTP_200_OK)
async def delete_economy_outlook(
    id: _uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    _admin: dict = Depends(get_admin_user),
) -> dict:
    result = await db.execute(select(EconomyOutlook).where(EconomyOutlook.id == id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Economy outlook not found")
    
    if item.chart_url and item.chart_url.startswith("/static/charts/"):
        filename = item.chart_url.split("/")[-1]
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass

    await db.delete(item)
    await db.commit()
    return {"message": "Economy outlook deleted successfully"}


@router.delete("/trade-ideas/{id}", status_code=status.HTTP_200_OK)
async def delete_trade_idea(
    id: _uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    _admin: dict = Depends(get_admin_user),
) -> dict:
    result = await db.execute(select(TradeIdea).where(TradeIdea.id == id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade idea not found")
    
    if item.chart_url and item.chart_url.startswith("/static/charts/"):
        filename = item.chart_url.split("/")[-1]
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass

    await db.delete(item)
    await db.commit()
    return {"message": "Trade idea deleted successfully"}

