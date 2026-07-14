import asyncio
import logging
from redis.asyncio import Redis

from services.market_ingestor.exchanges.binance import BinanceTickerStream
from services.market_ingestor.normalizer import normalize_binance_ticker
from znt_common.redis_keys import market_raw_stream, ticker_cache_key

logger = logging.getLogger(__name__)

class MarketIngestorWorker:
    def __init__(self, redis: Redis, exchange_name: str, config: dict, use_wildcard: bool = True):
        self.redis = redis
        self.exchange_name = exchange_name.lower()
        self.ws_base = config["ws_base"]
        self.quote_assets = config.get("quote_assets", ["USDT"])

        # Determine symbols to subscribe to
        if use_wildcard:
            if self.exchange_name == "binance":
                self.symbols = ["!ticker@arr"]
            else:
                self.symbols = config.get("initial_symbols", [])
        else:
            self.symbols = config.get("initial_symbols", [])

        # Initialize stream and normalizer based on exchange name
        if self.exchange_name == "binance":
            from services.market_ingestor.exchanges.binance import BinanceTickerStream
            self.stream = BinanceTickerStream(symbols=self.symbols, ws_base=self.ws_base)
            self.normalizer = normalize_binance_ticker
        elif self.exchange_name == "bybit":
            from services.market_ingestor.exchanges.bybit import BybitTickerStream
            self.stream = BybitTickerStream(symbols=self.symbols, ws_base=self.ws_base)
            self.normalizer = None  # To be implemented in Phase 2
        else:
            raise ValueError(f"Unsupported exchange: {self.exchange_name}")

    async def run(self) -> None:
        logger.info(f"Starting ingestor for {self.exchange_name} (wildcard: {self.symbols})")
        
        processed_count = 0

        while True:
            try:
                if not self.normalizer:
                    logger.warning(f"Normalizer for {self.exchange_name} is not implemented. Skipping stream run.")
                    await asyncio.sleep(60)
                    continue

                async for payload in self.stream.messages():
                    try:
                        normalized = self.normalizer(payload)
                        symbol = normalized["symbol"]

                        # Filter based on configured quote assets
                        is_valid_quote = any(symbol.endswith(quote) for quote in self.quote_assets)
                        if not is_valid_quote:
                            continue

                        # Push to stream for historical processing
                        await self.redis.xadd(market_raw_stream(self.exchange_name), normalized, maxlen=1000)
                        
                        # Update cache for instant UI access
                        await self.redis.hset(ticker_cache_key(symbol), mapping=normalized)

                        # Save active symbol dynamically in Redis Set
                        await self.redis.sadd("znt:active_symbols", symbol)

                        processed_count += 1

                        # Log progress every 500 tickers to avoid spam
                        if processed_count % 500 == 0:
                            logger.info(f"[{self.exchange_name}] Processed {processed_count} tickers total.")

                        # Optional: print for debugging (only BTCUSDT to avoid terminal spam)
                        if symbol == "BTCUSDT":
                            print(f"[{symbol}] Price: {normalized['price']} | Vol: {normalized['quote_volume']}", flush=True)

                    except Exception as inner_e:
                        logger.error(f"[{self.exchange_name}] Error processing payload: {inner_e} | Payload sample: {str(payload)[:200]}")

            except Exception as e:
                logger.error(f"Stream error on {self.exchange_name}: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)


if __name__ == "__main__":
    # Test script to run independently
    async def test():
        import os
        from redis.asyncio import Redis
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        r = Redis.from_url(redis_url, decode_responses=True)
        # Mock configuration for Binance
        mock_config = {
            "ws_base": "wss://stream.binance.com:9443",
            "quote_assets": ["USDT"],
            "initial_symbols": ["BTCUSDT"]
        }
        worker = MarketIngestorWorker(
            redis=r, 
            exchange_name="binance", 
            config=mock_config, 
            use_wildcard=False
        )
        await worker.run()

    logging.basicConfig(level=logging.INFO)
    asyncio.run(test())


