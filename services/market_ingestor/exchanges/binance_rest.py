import logging
import time

import httpx

from services.market_ingestor.exchanges.binance_kline import TIMEFRAME_MAP

logger = logging.getLogger(__name__)

BINANCE_REST_BASE_URL = "https://api.binance.com"
KLINES_PATH = "/api/v3/klines"
MAX_KLINE_LIMIT = 1000


class BinanceKlineRestClient:
    """Small REST client for seeding closed Binance klines before WS streaming."""

    def __init__(self, base_url: str = BINANCE_REST_BASE_URL) -> None:
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=15.0,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; ZNT-Terminal/1.0)",
            },
        )

    async def fetch_closed_klines(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
    ) -> list[dict]:
        """Return newest closed OHLCV bars, oldest first."""
        interval = TIMEFRAME_MAP.get(timeframe)
        if not interval:
            logger.warning("[binance-rest] Unsupported timeframe: %s", timeframe)
            return []

        request_limit = min(max(limit + 1, 1), MAX_KLINE_LIMIT)
        response = await self.client.get(
            KLINES_PATH,
            params={
                "symbol": symbol.upper(),
                "interval": interval,
                "limit": request_limit,
            },
        )
        response.raise_for_status()

        now_ms = int(time.time() * 1000)
        candles: list[dict] = []
        for row in response.json():
            close_time = int(row[6])
            if close_time >= now_ms:
                continue

            candles.append(
                {
                    "symbol": symbol.upper(),
                    "timeframe": timeframe,
                    "open_time": int(row[0]),
                    "open": float(row[1]),
                    "high": float(row[2]),
                    "low": float(row[3]),
                    "close": float(row[4]),
                    "volume": float(row[5]),
                    "quote_volume": float(row[7]),
                    "close_time": close_time,
                    "is_closed": True,
                }
            )

        return candles[-limit:]

    async def close(self) -> None:
        await self.client.aclose()
