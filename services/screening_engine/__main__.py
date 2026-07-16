import asyncio
import logging
import os

from redis.asyncio import Redis

from services.screening_engine.worker import ScreeningEngineWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

# All timeframes the engine screens — must match kline_timeframes in exchanges.yaml
ACTIVE_TIMEFRAMES = ["15m", "30m", "1h", "4h", "1d", "1w"]


async def main() -> None:
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # Engine reads bytes from Redis for flexibility; worker decodes internally
    redis = Redis.from_url(redis_url, decode_responses=False)

    # Allow overriding timeframes via env var (e.g. ENGINE_TIMEFRAMES=15m,1h)
    env_timeframes = os.environ.get("ENGINE_TIMEFRAMES", "")
    timeframes = (
        [tf.strip() for tf in env_timeframes.split(",") if tf.strip()]
        if env_timeframes
        else ACTIVE_TIMEFRAMES
    )

    logger.info(f"[Engine] Starting workers for timeframes: {timeframes}")

    # One worker per timeframe, all running concurrently
    workers = [ScreeningEngineWorker(redis=redis, timeframe=tf) for tf in timeframes]
    await asyncio.gather(*[w.run_forever() for w in workers])


if __name__ == "__main__":
    asyncio.run(main())
