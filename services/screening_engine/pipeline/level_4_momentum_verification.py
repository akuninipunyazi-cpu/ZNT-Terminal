from znt_common.market import ScreeningCandidate


def verify_momentum(
    candidates: list[ScreeningCandidate],
    config: dict,
) -> list[ScreeningCandidate]:
    output: list[ScreeningCandidate] = []

    for candidate in candidates:
        volume_zscore = float(candidate.metrics.get("volume_zscore", 0.0))
        entropy = float(candidate.metrics.get("sample_entropy", 1.0))
        liquidity_score = candidate.snapshot.liquidity_score

        organic_retail = _clamp(35 + volume_zscore * 6 + liquidity_score * 18 - entropy * 12)
        market_maker = _clamp(65 - organic_retail + entropy * 16)
        manipulation_risk = _clamp(20 + entropy * 22 - liquidity_score * 8)
        continuation = _clamp(organic_retail * 0.55 + volume_zscore * 4 - manipulation_risk * 0.2)

        candidate.metrics.update(
            {
                "organic_retail_probability": round(organic_retail, 2),
                "market_maker_activity_probability": round(market_maker, 2),
                "manipulation_risk_probability": round(manipulation_risk, 2),
                "continuation_probability": round(continuation, 2),
            }
        )
        candidate.passed_levels.append("level_4_momentum_verification")
        output.append(candidate)

    return output


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))
