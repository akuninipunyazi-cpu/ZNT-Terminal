from fastapi import APIRouter

from app.schemas.terminal import TimeframeStatus

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
