import asyncio
import logging
import os

from redis.asyncio import Redis

from services.market_ingestor.config import load_exchange_config
from services.market_ingestor.worker import MarketIngestorWorker

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


async def main() -> None:
    # 1. Load config from exchanges.yaml
    try:
        exchanges_config = load_exchange_config()
    except Exception as e:
        logger.error(f"Failed to load exchange configurations: {e}")
        return

    # 2. Setup Redis connection
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis = Redis.from_url(redis_url, decode_responses=True)

    # 3. Determine if wildcard or initial symbols should be used
    use_wildcard = os.environ.get("USE_WILDCARD", "true").lower() == "true"

    # 4. Spawn tasks for each enabled exchange
    tasks = []
    for exchange_name, config in exchanges_config.items():
        if not config.get("enabled", False):
            logger.info(f"Exchange {exchange_name} is disabled in config. Skipping.")
            continue

        logger.info(f"Initializing ingestor task for: {exchange_name}")
        worker = MarketIngestorWorker(
            redis=redis,
            exchange_name=exchange_name,
            config=config,
            use_wildcard=use_wildcard
        )
        tasks.append(worker.run())

    if not tasks:
        logger.warning("No enabled exchanges found. Exiting.")
        return

    # Run tasks concurrently
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())

