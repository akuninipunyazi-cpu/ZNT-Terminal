from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, HttpUrl
from typing import Optional


# ── Market Update ───────────────────────────────────────────────────────────

class MarketUpdateCreate(BaseModel):
    ticker: str
    reason: str


class MarketUpdateResponse(BaseModel):
    id: UUID
    ticker: str
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Economy Outlook ─────────────────────────────────────────────────────────

class EconomyOutlookCreate(BaseModel):
    indicator: str
    explanation: str


class EconomyOutlookResponse(BaseModel):
    id: UUID
    indicator: str
    explanation: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Trade Idea ──────────────────────────────────────────────────────────────

class TradeIdeaCreate(BaseModel):
    ticker: str
    direction: str  # LONG, SHORT
    trade_type: str  # Scalping, Intraday, Swing
    entry_price: float
    tp_levels: list[float]  # e.g., [68000.0, 69000.0, 70000.0]
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
