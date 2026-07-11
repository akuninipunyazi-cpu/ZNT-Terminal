import requests
import json

def test_rest():
    # URL Binance REST API (Jalur web biasa)
    url = "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
    
    print("--- ZNT REST API Test ---")
    print(f"Mencoba mengambil harga lewat REST: {url}")
    
    try:
        # Kita matikan verifikasi SSL juga untuk berjaga-jaga
        response = requests.get(url, verify=False, timeout=10)
        if response.status_code == 200:
            print("✅ BERHASIL LEWAT REST API!")
            print(f"Data: {response.text}")
        else:
            print(f"❌ GAGAL: Status Code {response.status_code}")
    except Exception as e:
        print(f"❌ GAGAL TOTAL: {e}")

if __name__ == "__main__":
    test_rest()
