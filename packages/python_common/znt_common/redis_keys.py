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


def news_stream_key() -> str:
    return "znt:news:stream"


def news_list_key() -> str:
    return "znt:news:latest"


def news_processed_set_key() -> str:
    return "znt:news:processed_ids"


# ── Candle / Kline keys ───────────────────────────────────────────────────────

def candle_series_key(symbol: str, timeframe: str) -> str:
    """Redis List storing last N closed OHLCV candles for a symbol+timeframe."""
    return f"znt:candle:{symbol.upper()}:{timeframe}"


def candle_closed_stream_key(timeframe: str) -> str:
    """Redis Stream that receives a message each time a candle closes for this timeframe."""
    return f"znt:kline:closed:{timeframe}"


def candle_live_key(symbol: str, timeframe: str) -> str:
    """Redis Hash storing the currently-open (live) candle for a symbol+timeframe."""
    return f"znt:candle:live:{symbol.upper()}:{timeframe}"


