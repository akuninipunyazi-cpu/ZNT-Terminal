from pathlib import Path
from typing import Any

import yaml

DEFAULT_CONFIG_PATH = Path("configs/engine/timeframes.yaml")


def load_timeframe_config(timeframe: str, path: Path = DEFAULT_CONFIG_PATH) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        payload = yaml.safe_load(file) or {}

    timeframes = payload.get("timeframes", {})
    if timeframe not in timeframes:
        raise KeyError(f"Unknown timeframe: {timeframe}")

    return dict(timeframes[timeframe])
