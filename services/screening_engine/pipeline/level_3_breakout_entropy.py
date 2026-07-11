from services.screening_engine.entropy.sample_entropy import sample_entropy
from znt_common.market import ScreeningCandidate


def detect_breakout_entropy(
    candidates: list[ScreeningCandidate],
    config: dict,
) -> list[ScreeningCandidate]:
    entropy_max = float(config["max_sample_entropy"])
    breakout_window = int(config["breakout_window"])
    output: list[ScreeningCandidate] = []

    for candidate in candidates:
        snapshot = candidate.snapshot
        if len(snapshot.close_series) <= breakout_window:
            continue

        previous_high = max(snapshot.high_series[-breakout_window - 1 : -1])
        previous_low = min(snapshot.low_series[-breakout_window - 1 : -1])
        latest_close = snapshot.close_series[-1]
        entropy = sample_entropy(snapshot.returns[-breakout_window:])

        is_up_breakout = latest_close > previous_high
        is_down_breakdown = latest_close < previous_low

        if not is_up_breakout and not is_down_breakdown:
            continue

        if entropy > entropy_max:
            continue

        candidate.side = "long" if is_up_breakout else "short"
        candidate.passed_levels.append("level_3_breakout_entropy")
        candidate.metrics["sample_entropy"] = round(entropy, 4)
        candidate.metrics["breakout_direction"] = candidate.side
        output.append(candidate)

    return output
