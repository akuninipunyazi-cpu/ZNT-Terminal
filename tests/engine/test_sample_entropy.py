from services.screening_engine.entropy.sample_entropy import sample_entropy


def test_sample_entropy_is_lower_for_repeating_series() -> None:
    repeating = [0.01, 0.02, 0.01, 0.02, 0.01, 0.02, 0.01, 0.02]
    noisy = [0.01, -0.03, 0.08, -0.01, 0.13, -0.07, 0.02, 0.11]

    assert sample_entropy(repeating) < sample_entropy(noisy)
