from dataclasses import dataclass, field


@dataclass(frozen=True)
class MarketSnapshot:
    symbol: str
    timeframe: str
    price: float
    quote_volume: float
    liquidity_score: float
    spread_bps: float
    close_series: list[float]
    high_series: list[float]
    low_series: list[float]
    volume_series: list[float]

    @property
    def returns(self) -> list[float]:
        if len(self.close_series) < 2:
            return []

        values: list[float] = []
        for previous, current in zip(self.close_series, self.close_series[1:], strict=False):
            if previous == 0:
                values.append(0.0)
            else:
                values.append((current - previous) / previous)
        return values


@dataclass
class ScreeningCandidate:
    snapshot: MarketSnapshot
    side: str = "neutral"
    score: float = 0.0
    passed_levels: list[str] = field(default_factory=list)
    metrics: dict[str, float | str] = field(default_factory=dict)

    @property
    def symbol(self) -> str:
        return self.snapshot.symbol


@dataclass(frozen=True)
class RankingResult:
    timeframe: str
    gainers: list[ScreeningCandidate]
    losers: list[ScreeningCandidate]
