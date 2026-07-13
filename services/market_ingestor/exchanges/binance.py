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
        # Gunakan format /stream?streams= karena terbukti stabil di VPS Anda
        base_url = self.ws_base.replace("/ws", "")
        
        # Jika simbol adalah wildcard, jangan tambahkan '@ticker'
        stream_names = "/".join(f"{s}@ticker" if "@" not in s else s for s in self.symbols)
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
                
                # Format combined stream membungkus data di dalam key "data"
                if "data" in payload:
                    data = payload["data"]
                    if isinstance(data, list):
                        for ticker in data:
                            yield ticker
                    else:
                        yield data
                elif isinstance(payload, list):
                    for ticker in payload:
                        yield ticker
                else:
                    yield payload
