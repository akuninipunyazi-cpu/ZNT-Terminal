import asyncio
import websockets
import json
import ssl

async def test():
    # Menggunakan Binance Futures (fstream) yang seringkali lebih stabil/terbuka
    url = "wss://fstream.binance.com/ws/btcusdt@ticker"
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    print(f"--- ZNT Futures Connection Test ---")
    print(f"Mencoba menyambung ke: {url}")
    
    try:
        async with websockets.connect(url, ssl=ssl_context) as ws:
            print("\n✅ BERHASIL TERHUBUNG KE FUTURES!")
            print("Menerima 5 data pertama:\n")
            
            for i in range(5):
                msg = await ws.recv()
                data = json.loads(msg)
                print(f"[{i+1}] {data.get('s')} | Harga: {data.get('c')}")
                
            print("\nJalur Futures AMAN.")
            
    except Exception as e:
        print(f"\n❌ GAGAL LAGI: {e}")
        print("\nKesimpulan Akhir:")
        print("1. Coba gunakan koneksi internet lain (Tethering HP misalnya).")
        print("2. Gunakan VPN (Cloudflare WARP sangat disarankan).")
        print("3. Matikan sementara Antivirus/Firewall Windows.")

if __name__ == "__main__":
    asyncio.run(test())
