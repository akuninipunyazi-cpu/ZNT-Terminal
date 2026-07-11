import asyncio
import websockets
import json
import ssl

async def test():
    # Bitget Public WebSocket URL
    url = "wss://ws.bitget.com/v2/ws/public"
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    print(f"--- ZNT Bitget Connection Test ---")
    print(f"Mencoba menyambung ke: {url}")
    
    try:
        async with websockets.connect(url, ssl=ssl_context) as ws:
            print("✅ BERHASIL TERHUBUNG KE BITGET!")
            
            # Kirim request subscribe ticker BTCUSDT
            subscribe_msg = {
                "op": "subscribe",
                "args": [{
                    "instType": "sp", # Spot
                    "channel": "ticker",
                    "instId": "BTCUSDT"
                }]
            }
            await ws.send(json.dumps(subscribe_msg))
            print("Request subscribe terkirim...")
            
            # Ambil 5 pesan
            count = 0
            while count < 5:
                msg = await ws.recv()
                data = json.loads(msg)
                
                # Filter pesan yang berisi data ticker
                if data.get("action") == "snapshot" or "data" in data:
                    print(f"[{count+1}] Bitget BTC: {data}")
                    count += 1
                else:
                    print(f"Info: {data}")
                    
            print("\nJalur Bitget AMAN.")
            
    except Exception as e:
        print(f"\n❌ GAGAL DI BITGET JUGA: {e}")
        print("\nKesimpulan:")
        print("Jika Bitget juga gagal, berarti Firewall/Antivirus di laptop Anda ")
        print("atau ISP Anda memblokir semua koneksi data di luar Browser.")

if __name__ == "__main__":
    asyncio.run(test())
