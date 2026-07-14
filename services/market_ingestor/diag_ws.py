import asyncio
import json
import ssl
import websockets


async def test():
    url = "wss://stream.binance.com:9443/ws/!ticker@arr"
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    headers = {"User-Agent": "Mozilla/5.0"}

    print(f"Connecting to: {url}")
    async with websockets.connect(url, ssl=ssl_ctx, additional_headers=headers) as ws:
        print("Connected! Menunggu pesan pertama (max 15 detik)...")
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=15)
            data = json.loads(msg)
            print(f"Pesan diterima! Tipe: {type(data).__name__}")
            if isinstance(data, list):
                print(f"Jumlah koin dalam satu pesan: {len(data)}")
                print(f"Contoh item pertama: {str(data[0])[:300]}")
            else:
                print(f"Keys: {list(data.keys())}")
                print(f"Sample: {str(data)[:300]}")
        except asyncio.TimeoutError:
            print("TIMEOUT: Tidak ada pesan diterima dalam 15 detik!")
            print("Kemungkinan Binance tidak mengirim data ke IP VPS ini untuk stream !ticker@arr")
            print("Solusi: Ganti ke pendekatan REST API + per-symbol stream.")


if __name__ == "__main__":
    asyncio.run(test())
