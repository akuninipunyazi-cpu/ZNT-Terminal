import asyncio
import logging
from redis.asyncio import Redis

from services.market_ingestor.exchanges.binance import BinanceTickerStream
from services.market_ingestor.normalizer import normalize_binance_ticker
from znt_common.redis_keys import market_raw_stream, ticker_cache_key

logger = logging.getLogger(__name__)

class MarketIngestorWorker:
    def __init__(self, redis: Redis, ws_base: str, symbols: list[str]):
        self.redis = redis
        self.stream = BinanceTickerStream(symbols=symbols, ws_base=ws_base)

    async def run(self) -> None:
        logger.info(f"Starting ingestor for {len(self.stream.symbols)} symbols on {self.stream.exchange}")
        
        while True:
            try:
                async for payload in self.stream.messages():
                    normalized = normalize_binance_ticker(payload)
                    symbol = normalized["symbol"]

                    # Push to stream for historical processing
                    await self.redis.xadd(market_raw_stream("binance"), normalized, maxlen=1000)
                    
                    # Update cache for instant UI access
                    await self.redis.hset(ticker_cache_key(symbol), mapping=normalized)
                    
                    # Optional: print for debugging (only top pair to avoid terminal spam)
                    if symbol == self.stream.symbols[0].upper():
                        print(f"[{symbol}] Price: {normalized['price']} | Vol: {normalized['quote_volume']}")

            except Exception as e:
                logger.error(f"Stream error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

if __name__ == "__main__":
    # Test script to run independently
    async def test():
        from redis.asyncio import Redis
        r = Redis(host='localhost', port=6379, decode_responses=True)
        # Testing with just BTC for now to ensure connection
        worker = MarketIngestorWorker(
            r, 
            "wss://stream.binance.com:9443", 
            ["BTCUSDT"]
        )
        await worker.run()

    logging.basicConfig(level=logging.INFO)
    asyncio.run(test())
