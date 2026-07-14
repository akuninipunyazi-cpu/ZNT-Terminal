import asyncio
import json
import logging
import ssl
from collections.abc import AsyncIterator

import websockets

logger = logging.getLogger(__name__)

# Max symbols per single WebSocket combined stream connection
BATCH_SIZE = 200


class BinanceTickerStream:
    exchange = "binance"

    def __init__(self, symbols: list[str], ws_base: str):
        self.symbols = [symbol.lower() for symbol in symbols]
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

    async def _stream_batch(self, batch: list[str], queue: asyncio.Queue) -> None:
        """Stream a batch of symbols and push received tickers into the shared queue."""
        base_url = self.ws_base.replace("/ws", "")
        stream_names = "/".join(f"{s}@ticker" for s in batch)
        url = f"{base_url}/stream?streams={stream_names}"

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
                        f"[binance] Batch connected: {len(batch)} symbols."
                    )
                    async for raw_message in socket:
                        payload = json.loads(raw_message)
                        # Combined stream wraps data inside a "data" key
                        if "data" in payload:
                            data = payload["data"]
                            if isinstance(data, list):
                                for ticker in data:
                                    await queue.put(ticker)
                            else:
                                await queue.put(data)
                        elif isinstance(payload, list):
                            for ticker in payload:
                                await queue.put(ticker)
                        else:
                            await queue.put(payload)
            except Exception as e:
                logger.error(
                    f"[binance] Batch stream error: {e}. Reconnecting in 5s..."
                )
                await asyncio.sleep(5)

    async def messages(self) -> AsyncIterator[dict]:
        """Yield ticker messages from all symbol batches concurrently."""
        if not self.symbols:
            logger.warning("[binance] No symbols to stream.")
            return

        queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=10000)

        # Split symbols into batches of BATCH_SIZE
        batches = [
            self.symbols[i : i + BATCH_SIZE]
            for i in range(0, len(self.symbols), BATCH_SIZE)
        ]

        logger.info(
            f"[binance] Launching {len(batches)} WebSocket connection(s) "
            f"for {len(self.symbols)} symbols total."
        )

        # Launch all batch tasks concurrently as background asyncio tasks
        tasks = [
            asyncio.create_task(self._stream_batch(batch, queue))
            for batch in batches
        ]

        try:
            while True:
                ticker = await queue.get()
                yield ticker
        finally:
            for task in tasks:
                task.cancel()
