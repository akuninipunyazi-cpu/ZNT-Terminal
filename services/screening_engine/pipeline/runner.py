from znt_common.market import MarketSnapshot, RankingResult

from services.screening_engine.pipeline.level_1_liquidity import filter_liquidity
from services.screening_engine.pipeline.level_2_volume_anomaly import detect_volume_anomalies
from services.screening_engine.pipeline.level_3_breakout_entropy import detect_breakout_entropy
from services.screening_engine.pipeline.level_4_momentum_verification import verify_momentum
from services.screening_engine.pipeline.level_5_ranking import rank_candidates


def run_pipeline(
    snapshots: list[MarketSnapshot],
    timeframe: str,
    config: dict,
) -> RankingResult:
    level_1 = filter_liquidity(snapshots, config)
    level_2 = detect_volume_anomalies(level_1, config)
    level_3 = detect_breakout_entropy(level_2, config)
    level_4 = verify_momentum(level_3, config)
    return rank_candidates(level_4, timeframe, config)
