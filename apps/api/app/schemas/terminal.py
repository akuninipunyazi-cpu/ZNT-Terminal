from pydantic import BaseModel


class TimeframeStatus(BaseModel):
    timeframe: str
    universe_count: int
    level_1_count: int
    level_2_count: int
    ranked_count: int
