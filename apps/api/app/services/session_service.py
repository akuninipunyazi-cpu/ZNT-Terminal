from uuid import uuid4

from redis.asyncio import Redis


class SessionService:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def start_session(self, user_id: str) -> str:
        session_id = str(uuid4())
        active_key = self._active_session_key(user_id)
        previous_session_id = await self.redis.get(active_key)

        if previous_session_id:
            await self.redis.set(
                self._revoked_session_key(previous_session_id),
                "1",
                ex=60 * 60 * 24 * 7,
            )

        await self.redis.set(active_key, session_id, ex=60 * 60 * 24 * 30)
        await self.redis.set(self._session_user_key(session_id), user_id, ex=60 * 60 * 24 * 30)
        return session_id

    async def is_active(self, user_id: str, session_id: str) -> bool:
        revoked = await self.redis.get(self._revoked_session_key(session_id))
        if revoked:
            return False

        active_session_id = await self.redis.get(self._active_session_key(user_id))
        return active_session_id == session_id

    async def revoke_session(self, session_id: str) -> None:
        await self.redis.set(self._revoked_session_key(session_id), "1", ex=60 * 60 * 24 * 7)

    @staticmethod
    def _active_session_key(user_id: str) -> str:
        return f"auth:active-session:{user_id}"

    @staticmethod
    def _revoked_session_key(session_id: str) -> str:
        return f"auth:revoked-session:{session_id}"

    @staticmethod
    def _session_user_key(session_id: str) -> str:
        return f"auth:session-user:{session_id}"
