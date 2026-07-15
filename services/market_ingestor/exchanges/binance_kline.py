import asyncio
import json
import logging
import ssl
from collections.abc import AsyncIterator

import websockets

logger = logging.getLogger(__name__)

# Max streams per single WebSocket combined stream connection (Binance limit)
KLINE_BATCH_SIZE = 200

# Timeframe → Binance interval string mapping
TIMEFRAME_MAP: dict[str, str] = {
    "15m": "15m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
    "1w": "1w",
}


class BinanceKlineStream:
    """
    Subscribes to Binance combined kline WebSocket streams for multiple
    symbols and timeframes. Yields CandleBar-compatible dicts for every
    kline event (both live updates and closed candles).

    Callers should filter on `is_closed == True` to act only on finished bars.
    """

    exchange = "binance"

    def __init__(self, symbols: list[str], timeframes: list[str], ws_base: str):
        self.symbols = [s.lower() for s in symbols]
        self.timeframes = [tf for tf in timeframes if tf in TIMEFRAME_MAP]
        self.ws_base = ws_base.rstrip("/")

    def _make_ssl_context(self) -> ssl.SSLContext:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

    def _make_headers(self) -> dict[str, str]:
        return {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }

    def _build_stream_names(self) -> list[str]:
        """Generate all <symbol>@kline_<interval> stream names."""
        return [
            f"{symbol}@kline_{TIMEFRAME_MAP[tf]}"
            for symbol in self.symbols
            for tf in self.timeframes
        ]

    @staticmethod
    def _parse_kline_event(raw: dict) -> dict | None:
        """
        Parse a Binance kline WebSocket message into a normalised candle dict.

        Binance kline payload structure:
          {
            "e": "kline",
            "E": 123456789,        # Event time
            "s": "BNBBTC",        # Symbol
            "k": {
              "t": 123400000,      # Open time
              "T": 123460000,      # Close time
              "i": "1m",           # Interval
              "o": "0.0010",       # Open
              "c": "0.0020",       # Close
              "h": "0.0025",       # High
              "l": "0.0015",       # Low
              "v": "1000",         # Base volume
              "q": "1.0000",       # Quote volume
              "x": false           # Is this kline closed?
            }
          }
        """
        try:
            # Combined stream wraps in {"stream": "...", "data": {...}}
            if "data" in raw:
                raw = raw["data"]

            if raw.get("e") != "kline":
                return None

            k = raw["k"]
            symbol = raw["s"].upper()
            # Map Binance interval back to our timeframe key
            interval = k["i"]
            # Find matching timeframe key (e.g., "1h" → "1h")
            timeframe = interval  # They are the same in our mapping

            return {
                "symbol": symbol,
                "timeframe": timeframe,
                "open_time": int(k["t"]),
                "open": float(k["o"]),
                "high": float(k["h"]),
                "low": float(k["l"]),
                "close": float(k["c"]),
                "volume": float(k["v"]),
                "quote_volume": float(k["q"]),
                "close_time": int(k["T"]),
                "is_closed": bool(k["x"]),
            }
        except (KeyError, TypeError, ValueError) as e:
            logger.debug(f"Failed to parse kline event: {e}")
            return None

    async def _stream_batch(self, stream_names: list[str], queue: asyncio.Queue) -> None:
        """Open one combined-stream WebSocket for a batch of stream names."""
        base_url = self.ws_base.replace("/ws", "")
        streams = "/".join(stream_names)
        url = f"{base_url}/stream?streams={streams}"

        while True:
            try:
                async with websockets.connect(
                    url,
                    ping_interval=20,
                    ping_timeout=20,
                    ssl=self._make_ssl_context(),
                    additional_headers=self._make_headers(),
                ) as socket:
                    logger.info(
                        f"[binance-kline] Batch connected: {len(stream_names)} streams."
                    )
                    async for raw_message in socket:
                        payload = json.loads(raw_message)
                        candle = self._parse_kline_event(payload)
                        if candle:
                            await queue.put(candle)
            except Exception as e:
                logger.error(
                    f"[binance-kline] Batch stream error: {e}. Reconnecting in 5s..."
                )
                await asyncio.sleep(5)

    async def messages(self) -> AsyncIterator[dict]:
        """
        Yield candle dicts from all symbol×timeframe kline streams concurrently.
        Consumers should check `candle["is_closed"]` to filter for completed bars.
        """
        stream_names = self._build_stream_names()
        if not stream_names:
            logger.warning("[binance-kline] No streams to subscribe to.")
            return

        queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=50_000)

        # Batch into groups of KLINE_BATCH_SIZE (Binance 200-stream limit)
        batches = [
            stream_names[i: i + KLINE_BATCH_SIZE]
            for i in range(0, len(stream_names), KLINE_BATCH_SIZE)
        ]

        logger.info(
            f"[binance-kline] Launching {len(batches)} WebSocket connection(s) "
            f"for {len(self.symbols)} symbols × {len(self.timeframes)} timeframes "
            f"= {len(stream_names)} streams total."
        )

        tasks = [
            asyncio.create_task(self._stream_batch(batch, queue))
            for batch in batches
        ]

        try:
            while True:
                candle = await queue.get()
                yield candle
        finally:
            for task in tasks:
                task.cancel()
