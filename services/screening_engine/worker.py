import asyncio
import json
import logging
from typing import Any

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
)

logger = logging.getLogger(__name__)

MIN_CANDLES_REQUIRED = 30
MAX_SYMBOLS_PER_CYCLE = 600

# Closed-candle events arrive per symbol. Debounce them into one engine cycle
# per timeframe boundary instead of running a full scan for every symbol.
TRIGGER_BATCH_COUNT = 500
TRIGGER_WAIT_BLOCK_MS = 3000
TRIGGER_DEBOUNCE_SECONDS = 2.0
TRIGGER_DRAIN_BLOCK_MS = 250

RANKING_CACHE_TTL_SECONDS = {
    "15m": 60 * 60,
    "30m": 90 * 60,
    "1h": 2 * 60 * 60,
    "4h": 6 * 60 * 60,
    "1d": 2 * 24 * 60 * 60,
    "1w": 14 * 24 * 60 * 60,
}


class ScreeningEngineWorker:
    """Candle-driven L1-L5 screening worker for a single timeframe."""

    def __init__(self, redis: Redis, timeframe: str) -> None:
        self.redis = redis
        self.timeframe = timeframe
        self.config = load_timeframe_config(timeframe)
        self._last_stream_id = "$"
        self._cycle_count = 0
        self._last_processed_close_time = 0

    async def run_once(self, trigger_close_time: int | None = None) -> None:
        """Build market snapshots from candle series, run pipeline, publish ranking."""
        symbols = await self._get_active_symbols()
        if not symbols:
            logger.warning("[Engine:%s] No active symbols found. Skipping cycle.", self.timeframe)
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
                "[Engine:%s] No symbols with enough candle history yet. Skipped %s symbols.",
                self.timeframe,
                skipped,
            )
            return

        result = run_pipeline(snapshots, self.timeframe, self.config)
        await self._publish(result)

        self._cycle_count += 1
        logger.info(
            "[Engine:%s] Cycle #%s | close_time=%s | screened=%s skipped=%s "
            "gainers=%s losers=%s",
            self.timeframe,
            self._cycle_count,
            trigger_close_time or "startup",
            len(snapshots),
            skipped,
            len(result.gainers),
            len(result.losers),
        )

    async def run_forever(self) -> None:
        """Listen for closed-candle triggers and process one batch per close boundary."""
        stream_key = candle_closed_stream_key(self.timeframe)
        logger.info(
            "[Engine:%s] Listening on stream '%s' for closed-candle triggers.",
            self.timeframe,
            stream_key,
        )

        # Publish a ranking immediately when Redis already has backfilled history.
        await self.run_once()

        while True:
            try:
                triggers = await self._collect_trigger_batch(stream_key)
                if not triggers:
                    continue

                close_time = max(trigger["close_time"] for trigger in triggers)
                if close_time and close_time <= self._last_processed_close_time:
                    logger.info(
                        "[Engine:%s] Skipping duplicate close_time=%s from %s trigger(s).",
                        self.timeframe,
                        close_time,
                        len(triggers),
                    )
                    continue

                if close_time:
                    self._last_processed_close_time = close_time

                logger.info(
                    "[Engine:%s] Processing %s trigger(s) for close_time=%s.",
                    self.timeframe,
                    len(triggers),
                    close_time,
                )
                await self.run_once(trigger_close_time=close_time or None)

            except RedisError as exc:
                logger.error("[Engine:%s] Redis error: %s. Retrying in 5s...", self.timeframe, exc)
                await asyncio.sleep(5)
            except Exception as exc:
                logger.error(
                    "[Engine:%s] Unexpected error: %s. Retrying in 5s...",
                    self.timeframe,
                    exc,
                )
                await asyncio.sleep(5)

    async def _get_active_symbols(self) -> list[str]:
        try:
            raw_symbols = await self.redis.smembers("znt:active_symbols")
        except RedisError:
            return []

        symbols = [
            symbol.decode("utf-8") if isinstance(symbol, bytes) else str(symbol)
            for symbol in raw_symbols
        ]
        return sorted(symbols)[:MAX_SYMBOLS_PER_CYCLE]

    async def _load_candle_series(self, symbol: str) -> list[CandleBar]:
        key = candle_series_key(symbol, self.timeframe)
        try:
            raw_list = await self.redis.lrange(key, 0, -1)
        except RedisError:
            return []

        bars: list[CandleBar] = []
        for raw in raw_list:
            try:
                data = json.loads(raw if isinstance(raw, str) else raw.decode("utf-8"))
                bars.append(
                    CandleBar(
                        symbol=data["symbol"],
                        timeframe=data["timeframe"],
                        open_time=int(data["open_time"]),
                        open=float(data["open"]),
                        high=float(data["high"]),
                        low=float(data["low"]),
                        close=float(data["close"]),
                        volume=float(data["volume"]),
                        quote_volume=float(data["quote_volume"]),
                        close_time=int(data["close_time"]),
                        is_closed=bool(data["is_closed"]),
                    )
                )
            except (KeyError, TypeError, ValueError, json.JSONDecodeError):
                continue

        return bars

    def _build_snapshot(self, symbol: str, bars: list[CandleBar]) -> MarketSnapshot | None:
        if len(bars) < MIN_CANDLES_REQUIRED:
            return None

        return MarketSnapshot(
            symbol=symbol,
            timeframe=self.timeframe,
            price=bars[-1].close,
            quote_volume=bars[-1].quote_volume,
            # Real order-book liquidity can replace these placeholders later.
            liquidity_score=0.75,
            spread_bps=5.0,
            close_series=[bar.close for bar in bars],
            high_series=[bar.high for bar in bars],
            low_series=[bar.low for bar in bars],
            volume_series=[bar.volume for bar in bars],
        )

    async def _publish(self, result: RankingResult) -> None:
        payload = {
            "timeframe": result.timeframe,
            "gainers": [_candidate_payload(candidate) for candidate in result.gainers],
            "losers": [_candidate_payload(candidate) for candidate in result.losers],
        }
        payload_str = json.dumps(payload)
        ttl_seconds = RANKING_CACHE_TTL_SECONDS.get(result.timeframe, 60 * 60)

        await self.redis.xadd(
            engine_rankings_stream(result.timeframe),
            {"payload": payload_str},
        )
        await self.redis.set(
            ranking_cache_key(result.timeframe, "gainers"),
            json.dumps(payload["gainers"]),
            ex=ttl_seconds,
        )
        await self.redis.set(
            ranking_cache_key(result.timeframe, "losers"),
            json.dumps(payload["losers"]),
            ex=ttl_seconds,
        )

    async def _collect_trigger_batch(self, stream_key: str) -> list[dict[str, Any]]:
        events = await self.redis.xread(
            {stream_key: self._last_stream_id},
            count=TRIGGER_BATCH_COUNT,
            block=TRIGGER_WAIT_BLOCK_MS,
        )
        if not events:
            return []

        triggers = self._consume_trigger_events(events)

        loop = asyncio.get_running_loop()
        deadline = loop.time() + TRIGGER_DEBOUNCE_SECONDS
        while loop.time() < deadline:
            remaining_ms = int((deadline - loop.time()) * 1000)
            block_ms = max(1, min(TRIGGER_DRAIN_BLOCK_MS, remaining_ms))
            more_events = await self.redis.xread(
                {stream_key: self._last_stream_id},
                count=TRIGGER_BATCH_COUNT,
                block=block_ms,
            )
            if more_events:
                triggers.extend(self._consume_trigger_events(more_events))

        return triggers

    def _consume_trigger_events(self, events: list) -> list[dict[str, Any]]:
        triggers: list[dict[str, Any]] = []
        for _stream, messages in events:
            for msg_id, data in messages:
                self._last_stream_id = (
                    msg_id.decode("utf-8") if isinstance(msg_id, bytes) else str(msg_id)
                )
                triggers.append(
                    {
                        "close_time": _int_field(data, "close_time"),
                        "symbol": _text_field(data, "symbol"),
                        "source": _text_field(data, "source"),
                    }
                )
        return triggers


def _candidate_payload(candidate: ScreeningCandidate) -> dict[str, object]:
    return {
        "symbol": candidate.symbol,
        "side": candidate.side,
        "score": candidate.score,
        "price": candidate.snapshot.price,
        "metrics": candidate.metrics,
        "passed_levels": candidate.passed_levels,
    }


def _field(data: dict, key: str) -> object | None:
    return data.get(key) or data.get(key.encode("utf-8"))


def _text_field(data: dict, key: str) -> str:
    value = _field(data, key)
    if value is None:
        return ""
    return value.decode("utf-8") if isinstance(value, bytes) else str(value)


def _int_field(data: dict, key: str) -> int:
    value = _field(data, key)
    if value is None:
        return 0
    try:
        return int(value.decode("utf-8") if isinstance(value, bytes) else value)
    except (TypeError, ValueError):
        return 0
