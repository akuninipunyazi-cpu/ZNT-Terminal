from typing import Protocol


class ExchangeWebSocketClient(Protocol):
    exchange: str

    async def stream(self) -> None:
        """Connect to exchange websocket and emit normalized events."""
