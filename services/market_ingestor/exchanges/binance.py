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
        
        # Jika hanya ada satu simbol dan itu adalah wildcard (misal diawali '!'), gunakan endpoint single stream /ws/
        if len(self.symbols) == 1 and self.symbols[0].startswith("!"):
            url = f"{base_url}/ws/{self.symbols[0]}"
        else:
            # Jika simbol adalah wildcard, jangan tambahkan '@ticker'
            stream_names = "/".join(f"{s}@ticker" if "@" not in s else s for s in self.symbols)
            url = f"{base_url}/stream?streams={stream_names}"

        print(f"Connecting to: {url}")

        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }

        async with websockets.connect(
            url, 
            ping_interval=20, 
            ping_timeout=20, 
            ssl=ssl_context,
            additional_headers=headers
        ) as socket:
            print(f"Successfully connected to Binance WebSocket: {url}", flush=True)
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
