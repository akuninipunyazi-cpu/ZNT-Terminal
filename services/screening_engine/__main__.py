import asyncio
import logging
import os

from redis.asyncio import Redis

from services.screening_engine.worker import ScreeningEngineWorker

logging.basicConfig(level=logging.INFO)


async def main() -> None:
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis = Redis.from_url(redis_url, decode_responses=False)

    timeframe = os.environ.get("ENGINE_TIMEFRAME", "15m")
    worker = ScreeningEngineWorker(redis, timeframe)
    await worker.run_forever()


asyncio.run(main())
