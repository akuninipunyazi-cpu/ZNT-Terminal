from pathlib import Path
from typing import Any
import yaml

DEFAULT_CONFIG_PATH = Path("configs/news.yaml")


def load_news_config(path: Path = DEFAULT_CONFIG_PATH) -> dict[str, Any]:
    """Loads configuration for news feeds from YAML."""
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found at: {path.absolute()}")

    with path.open("r", encoding="utf-8") as file:
        payload = yaml.safe_load(file) or {}

    return payload.get("feeds", {})
