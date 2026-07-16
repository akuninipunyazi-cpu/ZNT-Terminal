import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.redis import get_redis_client
from app.core.security import decode_access_token
from app.services.session_service import SessionService
from znt_common.redis_keys import ticker_cache_key

router = APIRouter()



@router.websocket("/ws/terminal")
async def terminal_socket(websocket: WebSocket, timeframe: str = "15m", token: str = "") -> None:
    await websocket.accept()
    settings = get_settings()

    user_id = "dev-user"
    session_id = "dev-session"

    if token and token != "dev":
        try:
            payload = decode_access_token(token)
            user_id = str(payload["sub"])
            session_id = str(payload["sid"])
        except (KeyError, ValueError):
            await websocket.send_json({"type": "auth_error"})
            await websocket.close(code=1008)
            return

    redis = get_redis_client()
    sessions = SessionService(redis)
    last_id = "$"
    last_news_id = "$"
    last_tape_time = 0.0

    try:
        while True:
            try:
                is_active = await sessions.is_active(user_id, session_id)
            except RedisError:
                is_active = settings.app_env == "local"

            if token != "dev" and not is_active:
                await websocket.send_json({"type": "session_revoked"})
                await websocket.close(code=1008)
                return

            # Read new rankings and news from the streams
            stream_key = f"engine.rankings.{timeframe}"
            news_stream_key = "znt:news:stream"
            try:
                # Shorten block to 2 seconds to allow regular tape updates
                events = await redis.xread(
                    {stream_key: last_id, news_stream_key: last_news_id},
                    count=1,
                    block=2000
                )
                if events:
                    for stream, messages in events:
                        for msg_id, data in messages:
                            payload = data.get("payload") or data.get(b"payload")
                            if payload:
                                if stream == stream_key:
                                    last_id = msg_id
                                    await websocket.send_json({
                                        "type": "terminal_update",
                                        "timeframe": timeframe,
                                        "data": json.loads(payload)
                                    })
                                    print(f"[WS] Sent terminal update for {timeframe}", flush=True)
                                elif stream == news_stream_key:
                                    last_news_id = msg_id
                                    await websocket.send_json({
                                        "type": "news_update",
                                        "data": json.loads(payload)
                                    })
                                    print(f"[WS] Sent news update", flush=True)
                
                # Fetch and send Live Tape updates (BTC, ETH, SOL, WLD, INJ, MEME, BNB, SEI)
                now = time.time()
                # Run every 2 seconds
                if now - last_tape_time >= 2.0:
                    last_tape_time = now
                    tape_symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "WLDUSDT", "INJUSDT", "MEMEUSDT", "BNBUSDT", "SEIUSDT"]
                    pipe = redis.pipeline()
                    for s in tape_symbols:
                        pipe.hgetall(ticker_cache_key(s))
                    results = await pipe.execute()
                    
                    tape_payload = {}
                    for s, ticker in zip(tape_symbols, results, strict=False):
                        if ticker:
                            price_val = ticker.get("price") or ticker.get(b"price")
                            change_val = ticker.get("price_change_percent") or ticker.get(b"price_change_percent")
                            if price_val:
                                s_short = s.replace("USDT", "")
                                price_str = price_val.decode() if isinstance(price_val, bytes) else str(price_val)
                                change_str = change_val.decode() if isinstance(change_val, bytes) else str(change_val) if change_val else "0"
                                tape_payload[s_short] = {
                                    "price": float(price_str),
                                    "change": float(change_str)
                                }
                    if tape_payload:
                        await websocket.send_json({
                            "type": "tape_update",
                            "data": tape_payload
                        })

                if not events:
                    # Heartbeat if no data
                    await websocket.send_json({
                        "type": "terminal_heartbeat",
                        "timeframe": timeframe,
                        "status": "waiting_for_signals",
                    })
                    print(f"[WS] Sent heartbeat for {timeframe}", flush=True)
            except RedisError:
                await asyncio.sleep(2)

    except WebSocketDisconnect:
        return

