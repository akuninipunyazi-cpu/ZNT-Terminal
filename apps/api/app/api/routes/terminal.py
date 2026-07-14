from fastapi import APIRouter, Query
import json

from app.schemas.terminal import TimeframeStatus
from app.core.redis import get_redis_client

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

