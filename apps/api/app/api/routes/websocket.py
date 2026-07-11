import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.redis import get_redis_client
from app.core.security import decode_access_token
from app.services.session_service import SessionService

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

            # Read new rankings from the engine stream
            stream_key = f"engine.rankings.{timeframe}"
            try:
                events = await redis.xread({stream_key: last_id}, count=1, block=5000)
                if events:
                    for _, messages in events:
                        for msg_id, data in messages:
                            last_id = msg_id
                            payload = data.get(b"payload")
                            if payload:
                                await websocket.send_json({
                                    "type": "terminal_update",
                                    "timeframe": timeframe,
                                    "data": json.loads(payload)
                                })
                else:
                    # Heartbeat if no data
                    await websocket.send_json({
                        "type": "terminal_heartbeat",
                        "timeframe": timeframe,
                        "status": "waiting_for_signals",
                    })
            except RedisError:
                await asyncio.sleep(2)

    except WebSocketDisconnect:
        return
