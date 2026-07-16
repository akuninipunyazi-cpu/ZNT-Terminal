import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class MarketUpdate(Base):
    __tablename__ = "market_updates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticker: Mapped[str] = mapped_column(String(48), nullable=False)
    reason: Mapped[str] = mapped_column(String(4000), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EconomyOutlook(Base):
    __tablename__ = "economy_outlooks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    indicator: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., CPI, PPI, FOMC
    explanation: Mapped[str] = mapped_column(String(4000), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TradeIdea(Base):
    __tablename__ = "trade_ideas"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticker: Mapped[str] = mapped_column(String(48), nullable=False)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)  # LONG, SHORT
    trade_type: Mapped[str] = mapped_column(String(48), nullable=False)  # Scalping, Intraday, Swing
    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    tp_levels: Mapped[list] = mapped_column(JSON, nullable=False)  # list of floats, e.g. [68000, 69000, 70000]
    sl: Mapped[float] = mapped_column(Float, nullable=False)  # Stop Loss
    rr: Mapped[str] = mapped_column(String(20), nullable=False)  # Risk-to-Reward Ratio, e.g., "1:2"
    reason: Mapped[str] = mapped_column(String(4000), nullable=False)
    chart_url: Mapped[str] = mapped_column(String(512), nullable=True)  # TradingView/image link
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
