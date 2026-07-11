from datetime import UTC, datetime
from typing import Any


def normalize_binance_ticker(payload: dict[str, Any]) -> dict[str, str]:
    return {
        "exchange": "binance",
        "symbol": str(payload["s"]),
        "event_time": str(payload.get("E") or int(datetime.now(UTC).timestamp() * 1000)),
        "price": str(payload.get("c", "0")),
        "quote_volume": str(payload.get("q", "0")),
        "base_volume": str(payload.get("v", "0")),
        "high": str(payload.get("h", "0")),
        "low": str(payload.get("l", "0")),
        "price_change_percent": str(payload.get("P", "0")),
    }
