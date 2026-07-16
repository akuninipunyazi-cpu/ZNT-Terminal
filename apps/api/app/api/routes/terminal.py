import json

from app.core.redis import get_redis_client
from app.schemas.terminal import RankingSnapshot, TimeframeStatus
from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/status/{timeframe}", response_model=TimeframeStatus)
async def timeframe_status(timeframe: str) -> TimeframeStatus:
    return TimeframeStatus(
        timeframe=timeframe,
        universe_count=1000,
        level_1_count=284,
        level_2_count=42,
        ranked_count=12,
    )


@router.get("/news")
async def get_latest_news(limit: int = Query(default=30, ge=1, le=100)) -> list[dict]:
    redis = get_redis_client()
    raw_news = await redis.lrange("znt:news:latest", 0, limit - 1)
    if not raw_news:
        return []
    return [json.loads(n) for n in raw_news]


@router.get("/rankings/{timeframe}", response_model=RankingSnapshot)
async def get_latest_rankings(timeframe: str) -> RankingSnapshot:
    redis = get_redis_client()
    raw_gainers = await redis.get(_ranking_cache_key(timeframe, "gainers"))
    raw_losers = await redis.get(_ranking_cache_key(timeframe, "losers"))

    gainers = _decode_json_list(raw_gainers)
    losers = _decode_json_list(raw_losers)
    source = "cache" if gainers or losers else "empty"

    return RankingSnapshot(
        timeframe=timeframe,
        gainers=gainers,
        losers=losers,
        source=source,
    )


def _decode_json_list(raw: str | bytes | None) -> list[dict]:
    if not raw:
        return []
    value = raw.decode("utf-8") if isinstance(raw, bytes) else raw
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _ranking_cache_key(timeframe: str, side: str) -> str:
    return f"cache:ranking:{timeframe}:{side}"
