import asyncio
import json
import logging
from dataclasses import dataclass, field

from redis.asyncio import Redis

from services.market_ingestor.candle_worker import CANDLE_SERIES_MAXLEN
from services.market_ingestor.exchanges.binance_rest import BinanceKlineRestClient
from znt_common.redis_keys import candle_closed_stream_key, candle_series_key

logger = logging.getLogger(__name__)


@dataclass
class CandleBackfillResult:
    checked: int = 0
    fetched: int = 0
    skipped: int = 0
    failed: int = 0
    trigger_close_times: dict[str, int] = field(default_factory=dict)


class CandleBackfillService:
    """Seeds Redis candle series with REST history before live kline streaming."""

    def __init__(
        self,
        redis: Redis,
        rest_client: BinanceKlineRestClient,
        history_limit: int = CANDLE_SERIES_MAXLEN,
        min_existing: int = 30,
        concurrency: int = 8,
        refresh_existing: bool = False,
    ) -> None:
        self.redis = redis
        self.rest_client = rest_client
        self.history_limit = min(history_limit, CANDLE_SERIES_MAXLEN)
        self.min_existing = min_existing
        self.semaphore = asyncio.Semaphore(max(1, concurrency))
        self.refresh_existing = refresh_existing

    async def run(self, symbols: list[str], timeframes: list[str]) -> CandleBackfillResult:
        result = CandleBackfillResult()
        tasks = [
            self._backfill_symbol_timeframe(symbol, timeframe, result)
            for symbol in symbols
            for timeframe in timeframes
        ]

        if not tasks:
            return result

        await asyncio.gather(*tasks)
        await self._publish_ready_triggers(result.trigger_close_times)

        logger.info(
            "[CandleBackfill] checked=%s fetched=%s skipped=%s failed=%s",
            result.checked,
            result.fetched,
            result.skipped,
            result.failed,
        )
        return result

    async def _backfill_symbol_timeframe(
        self,
        symbol: str,
        timeframe: str,
        result: CandleBackfillResult,
    ) -> None:
        async with self.semaphore:
            result.checked += 1
            series_key = candle_series_key(symbol, timeframe)

            if not self.refresh_existing:
                existing_len = await self.redis.llen(series_key)
                if existing_len >= self.min_existing:
                    result.skipped += 1
                    return

            try:
                candles = await self.rest_client.fetch_closed_klines(
                    symbol=symbol,
                    timeframe=timeframe,
                    limit=self.history_limit,
                )
            except Exception as exc:
                result.failed += 1
                logger.warning(
                    "[CandleBackfill] Failed %s %s: %s",
                    symbol,
                    timeframe,
                    exc,
                )
                return

            if not candles:
                result.failed += 1
                return

            payloads = [json.dumps(candle) for candle in candles]
            pipe = self.redis.pipeline()
            pipe.delete(series_key)
            pipe.rpush(series_key, *payloads)
            pipe.ltrim(series_key, -CANDLE_SERIES_MAXLEN, -1)
            await pipe.execute()

            result.fetched += 1
            close_time = int(candles[-1]["close_time"])
            result.trigger_close_times[timeframe] = max(
                close_time,
                result.trigger_close_times.get(timeframe, 0),
            )

    async def _publish_ready_triggers(self, close_times_by_timeframe: dict[str, int]) -> None:
        for timeframe, close_time in close_times_by_timeframe.items():
            await self.redis.xadd(
                candle_closed_stream_key(timeframe),
                {
                    "symbol": "__backfill__",
                    "timeframe": timeframe,
                    "close_time": str(close_time),
                    "source": "rest_backfill",
                },
            )
