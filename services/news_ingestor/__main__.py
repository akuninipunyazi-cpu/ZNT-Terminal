import asyncio
import logging
import os

from redis.asyncio import Redis

from services.news_ingestor.config import load_news_config
from services.news_ingestor.worker import NewsIngestorWorker

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)


async def main() -> None:
    # 1. Load config from configs/news.yaml
    try:
        feeds_config = load_news_config()
    except Exception as e:
        logger.error(f"Failed to load news configurations: {e}")
        return

    # 2. Setup Redis connection
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis = Redis.from_url(redis_url, decode_responses=True)

    logger.info("Initializing news ingestor task...")
    worker = NewsIngestorWorker(redis=redis, feeds=feeds_config)

    try:
        # Poll news feeds every 3 minutes (180 seconds)
        await worker.run_forever(interval_seconds=180)
    except asyncio.CancelledError:
        logger.info("News ingestor cancelled.")
    finally:
        await worker.close()
        await redis.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("News Ingestor stopped by user.")
