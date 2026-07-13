import asyncio
import logging
import os

from redis.asyncio import Redis

from services.market_ingestor.worker import MarketIngestorWorker

logging.basicConfig(level=logging.INFO)


async def main() -> None:
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis = Redis.from_url(redis_url, decode_responses=True)

    symbols = ["!ticker@arr"]
    ws_base = os.environ.get("BINANCE_WS_BASE", "wss://stream.binance.com:9443/ws")

    worker = MarketIngestorWorker(redis, ws_base, symbols)
    await worker.run()


asyncio.run(main())
