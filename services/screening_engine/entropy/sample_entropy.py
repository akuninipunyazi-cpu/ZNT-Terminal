from __future__ import annotations

import math
from statistics import pstdev


def sample_entropy(values: list[float], m: int = 2, r: float | None = None) -> float:
    """Compute Sample Entropy with Chebyshev distance.

    Lower values indicate more regular movement. Higher values indicate more
    randomness, which the ZNT pipeline treats as lower quality.
    """

    if len(values) <= m + 1:
        return 0.0

    tolerance = r
    if tolerance is None:
        deviation = pstdev(values)
        if deviation == 0:
            return 0.0
        tolerance = 0.2 * deviation

    matches_m = _count_matches(values, m, tolerance)
    matches_m_plus_1 = _count_matches(values, m + 1, tolerance)

    if matches_m == 0:
        return 10.0

    if matches_m_plus_1 == 0:
        return 10.0

    return -math.log(matches_m_plus_1 / matches_m)


def _count_matches(values: list[float], length: int, tolerance: float) -> int:
    count = 0
    windows = [values[index : index + length] for index in range(len(values) - length + 1)]

    for left_index, left in enumerate(windows):
        for right_index, right in enumerate(windows):
            if left_index == right_index:
                continue

            distance = max(abs(left_item - right_item) for left_item, right_item in zip(left, right))
            if distance <= tolerance:
                count += 1

    return count
