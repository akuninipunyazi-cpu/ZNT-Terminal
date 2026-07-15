"""
Screening Engine Worker — Candle-Driven

Data flow:
  Binance Kline WS → CandleWorker → Redis
    znt:candle:<SYMBOL>:<TF>  (List of closed OHLCV JSON)
    znt:kline:closed:<TF>     (Stream — trigger events when candle closes)

  This worker:
    1. Blocks on the per-timeframe closed-candle Redis Stream.
    2. When a candle closes, collects the OHLCV series for all active symbols
       that have enough history for this timeframe.
    3. Builds real MarketSnapshot objects from candle series.
    4. Runs the full L1-L5 screening pipeline.
    5. Publishes RankingResult back to Redis for the WebSocket layer.
"""

import asyncio
import json
import logging

from redis.asyncio import Redis
from redis.exceptions import RedisError

from services.screening_engine.config import load_timeframe_config
from services.screening_engine.pipeline.runner import run_pipeline
from znt_common.market import CandleBar, MarketSnapshot, RankingResult, ScreeningCandidate
from znt_common.redis_keys import (
    candle_closed_stream_key,
    candle_series_key,
    engine_rankings_stream,
    ranking_cache_key,
    ticker_cache_key,
)

logger = logging.getLogger(__name__)

# Minimum number of closed candles required to run the pipeline for a symbol
MIN_CANDLES_REQUIRED = 30

# Maximum symbols to process in one engine cycle (performance guard)
MAX_SYMBOLS_PER_CYCLE = 600


class ScreeningEngineWorker:
    def __init__(self, redis: Redis, timeframe: str) -> None:
        self.redis = redis
        self.timeframe = timeframe
        self.config = load_timeframe_config(timeframe)
        self._last_stream_id = "$"   # Only process events from now on
        self._cycle_count = 0

    # ── Pipeline helpers ──────────────────────────────────────────────────────

    async def _get_active_symbols(self) -> list[str]:
        """Return all symbols that have ticker data in Redis."""
        try:
            raw = await self.redis.smembers("znt:active_symbols")
            if raw:
                # decode bytes → str if Redis is in binary mode
                return [
                    s.decode("utf-8") if isinstance(s, bytes) else s
                    for s in raw
                ][:MAX_SYMBOLS_PER_CYCLE]
        except RedisError:
            pass
        return []

    async def _load_candle_series(self, symbol: str) -> list[CandleBar]:
        """
        Load the closed OHLCV candle list for symbol+timeframe from Redis.
        Returns a list of CandleBar (oldest → newest).
        """
        key = candle_series_key(symbol, self.timeframe)
        try:
            raw_list = await self.redis.lrange(key, 0, -1)
        except RedisError:
            return []

        bars: list[CandleBar] = []
        for raw in raw_list:
            try:
                d = json.loads(raw if isinstance(raw, str) else raw.decode())
                bars.append(
                    CandleBar(
                        symbol=d["symbol"],
                        timeframe=d["timeframe"],
                        open_time=int(d["open_time"]),
                        open=float(d["open"]),
                        high=float(d["high"]),
                        low=float(d["low"]),
                        close=float(d["close"]),
                        volume=float(d["volume"]),
                        quote_volume=float(d["quote_volume"]),
                        close_time=int(d["close_time"]),
                        is_closed=bool(d["is_closed"]),
                    )
                )
            except (KeyError, ValueError, json.JSONDecodeError):
                continue
        return bars

    async def _get_ticker_quote_volume(self, symbol: str) -> float:
        """
        Fall back to the 24h ticker quote volume stored by the ticker ingestor
        when we don't yet have enough kline history for a symbol.
        """
        try:
            raw = await self.redis.hget(ticker_cache_key(symbol), "quote_volume")
            if raw:
                return float(raw if isinstance(raw, str) else raw.decode())
        except (RedisError, ValueError):
            pass
        return 0.0

    def _build_snapshot(self, symbol: str, bars: list[CandleBar]) -> MarketSnapshot | None:
        """
        Convert a list of CandleBar into a MarketSnapshot for the pipeline.
        Returns None when there is insufficient history.
        """
        if len(bars) < MIN_CANDLES_REQUIRED:
            return None

        return MarketSnapshot(
            symbol=symbol,
            timeframe=self.timeframe,
            price=bars[-1].close,
            quote_volume=bars[-1].quote_volume,
            # Liquidity and spread are mocked until we integrate order-book data
            liquidity_score=0.75,
            spread_bps=5.0,
            close_series=[b.close for b in bars],
            high_series=[b.high for b in bars],
            low_series=[b.low for b in bars],
            volume_series=[b.volume for b in bars],
        )

    # ── Publishing ────────────────────────────────────────────────────────────

    async def _publish(self, result: RankingResult) -> None:
        payload = {
            "timeframe": result.timeframe,
            "gainers": [_candidate_payload(c) for c in result.gainers],
            "losers": [_candidate_payload(c) for c in result.losers],
        }
        payload_str = json.dumps(payload)

        await self.redis.xadd(
            engine_rankings_stream(result.timeframe),
            {"payload": payload_str},
        )
        await self.redis.set(
            ranking_cache_key(result.timeframe, "gainers"),
            json.dumps(payload["gainers"]),
            ex=300,
        )
        await self.redis.set(
            ranking_cache_key(result.timeframe, "losers"),
            json.dumps(payload["losers"]),
            ex=300,
        )

    # ── Main loop ─────────────────────────────────────────────────────────────

    async def run_once(self) -> None:
        """
        Collect candle series for all active symbols, build snapshots,
        run the pipeline, and publish results.
        """
        symbols = await self._get_active_symbols()
        if not symbols:
            logger.warning(f"[Engine:{self.timeframe}] No active symbols found. Skipping cycle.")
            return

        snapshots: list[MarketSnapshot] = []
        skipped = 0

        for symbol in symbols:
            bars = await self._load_candle_series(symbol)
            snapshot = self._build_snapshot(symbol, bars)
            if snapshot:
                snapshots.append(snapshot)
            else:
                skipped += 1

        if not snapshots:
            logger.info(
                f"[Engine:{self.timeframe}] No symbols with enough candle history yet. "
                f"Skipped {skipped} symbols."
            )
            return

        result = run_pipeline(snapshots, self.timeframe, self.config)
        await self._publish(result)

        self._cycle_count += 1
        logger.info(
            f"[Engine:{self.timeframe}] Cycle #{self._cycle_count} — "
            f"Screened {len(snapshots)} symbols (skipped {skipped}). "
            f"Gainers: {len(result.gainers)} | Losers: {len(result.losers)}"
        )

    async def run_forever(self) -> None:
        """
        Block on the per-timeframe closed-candle Redis Stream.
        Every time a candle closes (for any symbol in this timeframe),
        we wake up and run a full screening cycle.

        Using XREAD with block=0 (infinite wait) means we only consume
        CPU when a real candle-close event arrives — no busy polling.
        """
        stream_key = candle_closed_stream_key(self.timeframe)
        logger.info(
            f"[Engine:{self.timeframe}] Listening on stream '{stream_key}' "
            f"for closed-candle trigger events..."
        )

        while True:
            try:
                events = await self.redis.xread(
                    {stream_key: self._last_stream_id},
                    count=1,
                    block=0,   # Block indefinitely until a message arrives
                )

                if events:
                    for _stream, messages in events:
                        for msg_id, _data in messages:
                            # Advance the cursor so we don't re-process
                            self._last_stream_id = (
                                msg_id.decode() if isinstance(msg_id, bytes) else msg_id
                            )

                    # A candle just closed — run a full screening cycle
                    await self.run_once()

            except RedisError as e:
                logger.error(
                    f"[Engine:{self.timeframe}] Redis error: {e}. Retrying in 5s..."
                )
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(
                    f"[Engine:{self.timeframe}] Unexpected error: {e}. Retrying in 5s..."
                )
                await asyncio.sleep(5)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _candidate_payload(candidate: ScreeningCandidate) -> dict:
    return {
        "symbol": candidate.symbol,
        "side": candidate.side,
        "score": candidate.score,
        "price": candidate.snapshot.price,
        "metrics": candidate.metrics,
        "passed_levels": candidate.passed_levels,
    }
