def market_raw_stream(exchange: str) -> str:
    return f"market.raw.{exchange}"


def market_candle_stream(timeframe: str) -> str:
    return f"market.candles.{timeframe}"


def engine_candidates_stream(timeframe: str) -> str:
    return f"engine.candidates.{timeframe}"


def engine_rankings_stream(timeframe: str) -> str:
    return f"engine.rankings.{timeframe}"


def ranking_cache_key(timeframe: str, side: str) -> str:
    return f"cache:ranking:{timeframe}:{side}"


def ticker_cache_key(symbol: str) -> str:
    return f"cache:ticker:{symbol.upper()}"
