import asyncio
import json
import logging
import ssl
import urllib.request

logger = logging.getLogger(__name__)

BINANCE_EXCHANGE_INFO_URL = "https://api.binance.com/api/v3/exchangeInfo"


def _fetch_usdt_symbols_sync() -> list[str]:
    """Synchronously fetch all active USDT trading pairs from Binance REST API."""
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        BINANCE_EXCHANGE_INFO_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; ZNT-Terminal/1.0)"},
    )

    with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as response:
        data = json.loads(response.read())

    symbols = [
        s["symbol"]
        for s in data["symbols"]
        if s["quoteAsset"] == "USDT" and s["status"] == "TRADING"
    ]

    logger.info(f"Discovered {len(symbols)} active USDT pairs from Binance REST API.")
    return symbols


async def fetch_usdt_symbols() -> list[str]:
    """Async wrapper: fetch USDT symbols without blocking the event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _fetch_usdt_symbols_sync)
