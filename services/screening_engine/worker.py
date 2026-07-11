import asyncio
import json

from redis.asyncio import Redis

from services.screening_engine.config import load_timeframe_config
from services.screening_engine.pipeline.runner import run_pipeline
from znt_common.market import MarketSnapshot, RankingResult, ScreeningCandidate
from znt_common.redis_keys import engine_rankings_stream, ranking_cache_key


class ScreeningEngineWorker:
    def __init__(self, redis: Redis, timeframe: str):
        self.redis = redis
        self.timeframe = timeframe
        self.config = load_timeframe_config(timeframe)

    async def run_once(self, snapshots: list[MarketSnapshot]) -> RankingResult:
        result = run_pipeline(snapshots, self.timeframe, self.config)
        await self.publish(result)
        return result

    async def publish(self, result: RankingResult) -> None:
        payload = {
            "timeframe": result.timeframe,
            "gainers": [_candidate_payload(candidate) for candidate in result.gainers],
            "losers": [_candidate_payload(candidate) for candidate in result.losers],
        }

        await self.redis.xadd(
            engine_rankings_stream(result.timeframe),
            {"payload": json.dumps(payload)},
        )
        await self.redis.set(
            ranking_cache_key(result.timeframe, "gainers"),
            json.dumps(payload["gainers"]),
            ex=30,
        )
        await self.redis.set(
            ranking_cache_key(result.timeframe, "losers"),
            json.dumps(payload["losers"]),
            ex=30,
        )

    async def run_forever(self) -> None:
        """Process market data continuously and publish rankings."""
        while True:
            # In a production environment, we would read from market_candle_stream
            # and maintain a rolling window of history for each symbol.
            # For this implementation, we simulate snapshots from the ticker cache
            # to demonstrate the pipeline flow.
            
            symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "WLDUSDT", "INJUSDT", "MEMEUSDT", "BNBUSDT", "SEIUSDT"]
            snapshots = []

            for symbol in symbols:
                raw_ticker = await self.redis.hgetall(ticker_cache_key(symbol))
                if not raw_ticker:
                    continue

                # Hydrate a mock snapshot based on current ticker + some simulated history
                # In real usage, this would be retrieved from a TimeSeries DB or Redis Stack
                snapshot = self._hydrate_mock_snapshot(symbol, raw_ticker)
                snapshots.append(snapshot)

            if snapshots:
                await self.run_once(snapshots)

            await asyncio.sleep(5)  # Engine pulse frequency

    def _hydrate_mock_snapshot(self, symbol: str, ticker: dict) -> MarketSnapshot:
        """Creates a snapshot with simulated history for demonstration."""
        price = float(ticker.get(b"price", 0.0) or 0.0)
        volume = float(ticker.get(b"quote_volume", 0.0) or 0.0)
        
        # Simulate some variance for entropy and breakout detection
        import random
        base_series = [price * (1 + random.uniform(-0.02, 0.02)) for _ in range(50)]
        base_series.append(price)
        
        return MarketSnapshot(
            symbol=symbol,
            timeframe=self.timeframe,
            price=price,
            quote_volume=volume,
            liquidity_score=0.8,  # Mock
            spread_bps=2.5,       # Mock
            close_series=base_series,
            high_series=[p * 1.002 for p in base_series],
            low_series=[p * 0.998 for p in base_series],
            volume_series=[volume * random.uniform(0.5, 2.0) for _ in range(51)],
        )


def _candidate_payload(candidate: ScreeningCandidate) -> dict[str, object]:
    return {
        "symbol": candidate.symbol,
        "side": candidate.side,
        "score": candidate.score,
        "price": candidate.snapshot.price,
        "metrics": candidate.metrics,
        "passed_levels": candidate.passed_levels,
    }
