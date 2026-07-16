from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional


# ── Market Update ───────────────────────────────────────────────────────────

class MarketUpdateCreate(BaseModel):
    ticker: str
    reason: str
    chart_url: Optional[str] = None


class MarketUpdateResponse(BaseModel):
    id: UUID
    ticker: str
    reason: str
    chart_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Economy Outlook ─────────────────────────────────────────────────────────

class EconomyOutlookCreate(BaseModel):
    indicator: str
    explanation: str
    chart_url: Optional[str] = None


class EconomyOutlookResponse(BaseModel):
    id: UUID
    indicator: str
    explanation: str
    chart_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Trade Idea ──────────────────────────────────────────────────────────────

class TradeIdeaCreate(BaseModel):
    ticker: str
    direction: str
    trade_type: str
    entry_price: float
    tp_levels: list[float]
    sl: float
    rr: str
    reason: str
    chart_url: Optional[str] = None


class TradeIdeaResponse(BaseModel):
    id: UUID
    ticker: str
    direction: str
    trade_type: str
    entry_price: float
    tp_levels: list[float]
    sl: float
    rr: str
    reason: str
    chart_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

