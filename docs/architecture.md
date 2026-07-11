# ZNT Terminal Architecture

## Product Boundary

ZNT Terminal is a screening platform for Z Nexus Trade members. It can rank anomalies, label probabilities, and show market structure signals. It must not produce financial advice language such as guaranteed buy/sell instructions.

## System Flow

```txt
Exchange WebSocket
  -> market ingestor
  -> Redis Streams
  -> screening engine
  -> Redis cache and result streams
  -> FastAPI WebSocket gateway
  -> Next.js terminal
```

REST is used for auth, account setup, payment, and user metadata. WebSocket is used for processed terminal updates.

## Durable State

PostgreSQL is the source of truth for:

- users
- subscriptions
- payments
- active session audit
- webhook records
- account setup tokens

Redis is used for:

- realtime streams
- latest ticker cache
- latest ranking cache
- active session lookup
- temporary revocation markers

## Single Active Session

Login creates a new `session_id`. The backend stores that session as the only active session for the user. Any previous session is marked revoked in Redis. API requests and WebSocket connections check the JWT `sid` against the active session. If it is no longer active, the frontend logs out.
