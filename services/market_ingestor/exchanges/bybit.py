class BybitTickerStream:
    exchange = "bybit"

    def __init__(self, symbols: list[str], ws_base: str):
        self.symbols = symbols
        self.ws_base = ws_base

    async def messages(self):
        raise NotImplementedError("Bybit websocket subscription is scheduled for phase 2.")
