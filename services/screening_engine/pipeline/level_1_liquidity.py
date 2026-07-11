from znt_common.market import MarketSnapshot, ScreeningCandidate


def filter_liquidity(
    snapshots: list[MarketSnapshot],
    config: dict,
) -> list[ScreeningCandidate]:
    min_quote_volume = float(config["min_quote_volume"])
    min_liquidity_score = float(config["min_liquidity_score"])
    max_spread_bps = float(config["max_spread_bps"])

    candidates: list[ScreeningCandidate] = []
    for snapshot in snapshots:
        if snapshot.quote_volume < min_quote_volume:
            continue

        if snapshot.liquidity_score < min_liquidity_score:
            continue

        if snapshot.spread_bps > max_spread_bps:
            continue

        candidates.append(
            ScreeningCandidate(
                snapshot=snapshot,
                passed_levels=["level_1_liquidity"],
                metrics={
                    "quote_volume": snapshot.quote_volume,
                    "liquidity_score": snapshot.liquidity_score,
                    "spread_bps": snapshot.spread_bps,
                },
            )
        )

    return candidates
