import asyncio
import logging
import os

from redis.asyncio import Redis

from services.market_ingestor.candle_worker import CandleWorker
from services.market_ingestor.config import load_exchange_config
from services.market_ingestor.worker import MarketIngestorWorker

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# How long to wait after startup before launching the candle worker,
# giving the ticker ingestor time to populate znt:active_symbols.
CANDLE_WORKER_BOOT_DELAY_SECONDS = 30


async def main() -> None:
    # 1. Load config from configs/exchanges.yaml
    try:
        exchanges_config = load_exchange_config()
    except Exception as e:
        logger.error(f"Failed to load exchange configurations: {e}")
        return

    # 2. Setup Redis connection (decode_responses=True for ticker worker)
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis = Redis.from_url(redis_url, decode_responses=True)

    use_wildcard = os.environ.get("USE_WILDCARD", "true").lower() == "true"

    # 3. Spawn ticker workers (Stream A — Live UI / Chart / Tape)
    ticker_tasks: list[asyncio.coroutine] = []
    candle_tasks: list[asyncio.coroutine] = []

    for exchange_name, config in exchanges_config.items():
        if not config.get("enabled", False):
            logger.info(f"Exchange {exchange_name} is disabled in config. Skipping.")
            continue

        logger.info(f"Initializing ticker ingestor for: {exchange_name}")
        ticker_worker = MarketIngestorWorker(
            redis=redis,
            exchange_name=exchange_name,
            config=config,
            use_wildcard=use_wildcard,
        )
        ticker_tasks.append(ticker_worker.run())

        # 4. Candle worker (Stream B — Candle/Kline → Engine)
        kline_timeframes = config.get("kline_timeframes", ["15m", "1h", "4h"])
        ws_base = config.get("ws_base", "wss://stream.binance.com:9443")

        candle_tasks.append(
            _launch_candle_worker_after_delay(
                redis=redis,
                ws_base=ws_base,
                timeframes=kline_timeframes,
                use_wildcard=use_wildcard,
                initial_symbols=config.get("initial_symbols", []),
                delay=CANDLE_WORKER_BOOT_DELAY_SECONDS,
            )
        )

    if not ticker_tasks:
        logger.warning("No enabled exchanges found. Exiting.")
        return

    # Run everything concurrently
    await asyncio.gather(*ticker_tasks, *candle_tasks)


async def _launch_candle_worker_after_delay(
    redis: Redis,
    ws_base: str,
    timeframes: list[str],
    use_wildcard: bool,
    initial_symbols: list[str],
    delay: int,
) -> None:
    """
    Wait for the ticker ingestor to populate znt:active_symbols, then
    launch the CandleWorker with all discovered symbols.
    """
    logger.info(
        f"[CandleWorker] Waiting {delay}s for ticker ingestor to populate active symbols..."
    )
    await asyncio.sleep(delay)

    # Use the dynamic active symbol set if wildcard mode is on
    if use_wildcard:
        raw_symbols = await redis.smembers("znt:active_symbols")
        symbols = list(raw_symbols) if raw_symbols else initial_symbols
    else:
        symbols = initial_symbols

    if not symbols:
        logger.warning("[CandleWorker] No symbols found. Falling back to initial_symbols.")
        symbols = initial_symbols

    logger.info(
        f"[CandleWorker] Subscribing to klines for {len(symbols)} symbols "
        f"across timeframes: {timeframes}"
    )

    worker = CandleWorker(
        redis=redis,
        symbols=symbols,
        timeframes=timeframes,
        ws_base=ws_base,
    )
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())


