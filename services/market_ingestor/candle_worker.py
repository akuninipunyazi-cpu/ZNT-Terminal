import asyncio
import json
import logging

from redis.asyncio import Redis

from services.market_ingestor.exchanges.binance_kline import BinanceKlineStream
from znt_common.redis_keys import (
    candle_closed_stream_key,
    candle_live_key,
    candle_series_key,
)

logger = logging.getLogger(__name__)

# How many closed candles to keep in Redis per symbol per timeframe
CANDLE_SERIES_MAXLEN = 200

# How many closed-candle events to keep in the engine trigger stream
CLOSED_STREAM_MAXLEN = 5000


class CandleWorker:
    """
    Subscribes to Binance Kline WebSocket streams for all active symbols
    across multiple timeframes. For each closed candle:

      1. Stores the candle in a per-symbol Redis List  (candle series)
      2. Publishes a lightweight event to a per-timeframe Redis Stream
         so the Screening Engine can wake up and process it.

    Live (not-yet-closed) candles are written to a Redis Hash so the
    UI can display a live-updating current bar without triggering the engine.
    """

    def __init__(
        self,
        redis: Redis,
        symbols: list[str],
        timeframes: list[str],
        ws_base: str,
    ) -> None:
        self.redis = redis
        self.symbols = symbols
        self.timeframes = timeframes
        self.ws_base = ws_base
        self.stream = BinanceKlineStream(
            symbols=symbols,
            timeframes=timeframes,
            ws_base=ws_base,
        )
        self._closed_count: int = 0

    async def _store_closed_candle(self, candle: dict) -> None:
        """Persist a closed candle to Redis and publish a trigger event."""
        symbol = candle["symbol"]
        timeframe = candle["timeframe"]
        series_key = candle_series_key(symbol, timeframe)
        stream_key = candle_closed_stream_key(timeframe)

        payload = json.dumps(candle)

        pipe = self.redis.pipeline()

        # 1. Append candle to the per-symbol series list (newest at right)
        pipe.rpush(series_key, payload)
        pipe.ltrim(series_key, -CANDLE_SERIES_MAXLEN, -1)

        # 2. Publish a compact trigger event to the per-timeframe stream
        #    Engine reads this stream to know a new candle is ready.
        pipe.xadd(
            stream_key,
            {
                "symbol": symbol,
                "timeframe": timeframe,
                "close": str(candle["close"]),
                "close_time": str(candle["close_time"]),
            },
            maxlen=CLOSED_STREAM_MAXLEN,
        )

        await pipe.execute()

    async def _store_live_candle(self, candle: dict) -> None:
        """Update the live (open) candle hash for UI consumption."""
        symbol = candle["symbol"]
        timeframe = candle["timeframe"]
        live_key = candle_live_key(symbol, timeframe)

        # Flatten candle to string values for Redis Hash compatibility
        mapping = {k: str(v) for k, v in candle.items()}
        await self.redis.hset(live_key, mapping=mapping)
        # Expire live candle after 1 week to avoid stale keys
        await self.redis.expire(live_key, 604_800)

    async def run(self) -> None:
        """Main event loop: process all incoming kline events."""
        logger.info(
            f"[CandleWorker] Starting for {len(self.symbols)} symbols "
            f"across timeframes: {self.timeframes}"
        )

        async for candle in self.stream.messages():
            try:
                if candle["is_closed"]:
                    await self._store_closed_candle(candle)
                    self._closed_count += 1
                    if self._closed_count % 100 == 0:
                        logger.info(
                            f"[CandleWorker] {self._closed_count} candles closed and stored."
                        )
                else:
                    # Live candle — update UI hash only
                    await self._store_live_candle(candle)
            except Exception as e:
                logger.error(f"[CandleWorker] Error processing candle: {e}")
