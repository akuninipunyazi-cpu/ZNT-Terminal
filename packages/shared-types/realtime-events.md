# Realtime Events

The browser should receive processed terminal events, not raw exchange ticks.

## `terminal_heartbeat`

```json
{
  "type": "terminal_heartbeat",
  "timeframe": "15m",
  "status": "screening"
}
```

## `ranking_update`

```json
{
  "type": "ranking_update",
  "timeframe": "15m",
  "gainers": [],
  "losers": []
}
```

## `session_revoked`

Sent when a newer login invalidates the current active session.

```json
{
  "type": "session_revoked"
}
```
