import json
import ssl
from collections.abc import AsyncIterator

import websockets


class BinanceTickerStream:
    exchange = "binance"

    def __init__(self, symbols: list[str], ws_base: str):
        self.symbols = [symbol.lower() for symbol in symbols]
        self.ws_base = ws_base.rstrip("/")

    async def messages(self) -> AsyncIterator[dict]:
        # Gunakan format /stream?streams= karena lebih stabil di banyak jaringan
        # Hapus suffix '/ws' jika ada untuk combined stream Binance
        base_url = self.ws_base.replace("/ws", "")
        
        if "!ticker@arr" in self.symbols:
            url = f"{base_url}/ws/!ticker@arr"
        else:
            stream_names = "/".join(f"{s}@ticker" for s in self.symbols)
            url = f"{base_url}/stream?streams={stream_names}"

        print(f"Connecting to: {url}")

        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        async with websockets.connect(
            url, 
            ping_interval=20, 
            ping_timeout=20, 
            ssl=ssl_context
        ) as socket:
            async for raw_message in socket:
                payload = json.loads(raw_message)
                
                # Jika data berupa list (seperti !ticker@arr), pecah dan yield satu per satu
                if isinstance(payload, list):
                    for ticker in payload:
                        yield ticker
                # Data di format /stream selalu ada di dalam key "data"
                elif "data" in payload:
                    yield payload["data"]
                else:
                    yield payload
