from statistics import mean, pstdev

from znt_common.market import ScreeningCandidate


def detect_volume_anomalies(
    candidates: list[ScreeningCandidate],
    config: dict,
) -> list[ScreeningCandidate]:
    min_zscore = float(config["volume_zscore"])
    output: list[ScreeningCandidate] = []

    for candidate in candidates:
        volumes = candidate.snapshot.volume_series
        if len(volumes) < 4:
            continue

        current_volume = volumes[-1]
        baseline = volumes[:-1]
        baseline_mean = mean(baseline)
        baseline_deviation = pstdev(baseline)

        if baseline_deviation == 0:
            zscore = 0.0
        else:
            zscore = (current_volume - baseline_mean) / baseline_deviation

        if zscore < min_zscore:
            continue

        candidate.passed_levels.append("level_2_volume_anomaly")
        candidate.metrics["volume_zscore"] = round(zscore, 4)
        output.append(candidate)

    return output
