import urllib.request
import os

def check_proxy():
    print("--- System Proxy Check ---")
    
    # Cek Environment Variables
    proxies = urllib.request.getproxies()
    if not proxies:
        print("✅ Tidak ada Proxy sistem yang terdeteksi di level Python.")
    else:
        print("⚠️ Terdeteksi Proxy:")
        for proto, url in proxies.items():
            print(f"   - {proto}: {url}")

    # Cek koneksi HTTP biasa
    try:
        urllib.request.urlopen("http://www.google.com", timeout=5)
        print("✅ Koneksi HTTP Biasa: OK")
    except Exception as e:
        print(f"❌ Koneksi HTTP Gagal: {e}")

if __name__ == "__main__":
    check_proxy()
