from znt_common.market import RankingResult, ScreeningCandidate


def rank_candidates(
    candidates: list[ScreeningCandidate],
    timeframe: str,
    config: dict,
) -> RankingResult:
    max_ranked = int(config["max_ranked"])

    for candidate in candidates:
        entropy = float(candidate.metrics.get("sample_entropy", 1.0))
        volume_zscore = float(candidate.metrics.get("volume_zscore", 0.0))
        continuation = float(candidate.metrics.get("continuation_probability", 0.0))
        liquidity_score = candidate.snapshot.liquidity_score

        candidate.score = round(
            continuation * 0.45
            + volume_zscore * 10
            + liquidity_score * 20
            + max(0.0, 1.0 - entropy) * 25,
            4,
        )
        candidate.passed_levels.append("level_5_ranking")

    ranked = sorted(candidates, key=lambda item: item.score, reverse=True)
    gainers = [candidate for candidate in ranked if candidate.side == "long"][:max_ranked]
    losers = [candidate for candidate in ranked if candidate.side == "short"][:max_ranked]

    return RankingResult(timeframe=timeframe, gainers=gainers, losers=losers)
