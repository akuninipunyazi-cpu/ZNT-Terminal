import asyncio
import websockets
import json
import ssl
import sys

async def test():
    # URL Binance Spot (format paling simpel)
    url = "wss://stream.binance.com:9443/ws/btcusdt@ticker"
    
    # Bypass SSL (karena masalah Windows tadi)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Mimic browser headers to be safe
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
    
    print(f"--- ZNT Connection Test ---")
    print(f"Mencoba menyambung ke: {url}")
    
    try:
        # Kita coba pakai 'additional_headers' untuk versi websockets terbaru
        async with websockets.connect(
            url, 
            ssl=ssl_context, 
            additional_headers=headers
        ) as ws:
            print("\n✅ BERHASIL TERHUBUNG!")
            print("Menerima 5 data pertama:\n")
            
            for i in range(5):
                msg = await ws.recv()
                data = json.loads(msg)
                price = data.get('c', '0')
                symbol = data.get('s', 'UNKNOWN')
                print(f"[{i+1}] {symbol} | Harga: {price}")
                
            print("\nSemua data diterima dengan baik. Jalur WebSocket Aman.")
            
    except Exception as e:
        print(f"\n❌ GAGAL: {e}")
        print("\nAnalisis:")
        if "HTTP 200" in str(e):
            print("- Binance mengira kita mau buka web biasa (bukan WS).")
            print("- Kemungkinan ada Proxy atau Firewall di laptop Anda yang mengubah requestnya.")
        elif "CERTIFICATE_VERIFY_FAILED" in str(e):
            print("- Masalah sertifikat SSL Windows (tapi harusnya sudah di-bypass).")
        else:
            print("- Ada gangguan koneksi atau IP Anda sedang dibatasi sementara oleh Binance.")

if __name__ == "__main__":
    try:
        asyncio.run(test())
    except KeyboardInterrupt:
        print("\nTes dihentikan.")
