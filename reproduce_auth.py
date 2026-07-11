import asyncio
from app.core.config import get_settings
from app.services.auth_service import AuthService
from redis.asyncio import Redis

async def test_auth():
    settings = get_settings()
    print(f"APP_ENV: {settings.app_env}")
    
    # Mock redis for testing auth logic
    class MockRedis:
        async def get(self, *args, **kwargs): return None
        async def set(self, *args, **kwargs): return None
        def hset(self, *args, **kwargs): pass
        
    auth_service = AuthService(MockRedis())
    try:
        token_response = await auth_service.login("demo", "demo12345")
        print(f"Login successful: {token_response.access_token[:10]}...")
    except Exception as e:
        print(f"Login failed: {e}")

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.path.join(os.getcwd(), "apps", "api"))
    asyncio.run(test_auth())
