# ZNT Terminal

ZNT Terminal is the first product foundation for Z Nexus Trade: a premium crypto screening platform focused on anomaly detection, market structure filters, and realtime watchlists.

The platform provides screening tools only. It must not present outputs as financial advice.

## Architecture

```txt
apps/web                 Next.js terminal UI
apps/api                 FastAPI REST and WebSocket gateway
services/market_ingestor Exchange websocket clients and normalization
services/screening_engine Realtime screening pipeline and ranking
packages/python_common   Shared Python utilities
packages/shared-types    Shared frontend/backend contract notes
configs                  Timeframe and engine thresholds
infra                    Docker, Nginx, and process manager files
docs                     Architecture and handoff docs
```

## Local Development

```powershell
npm install
npm run dev:web
```

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
npm run dev:api
```

## Core Rule

Redis is for streams and cache. PostgreSQL is the durable source of truth for users, payments, subscriptions, active sessions, and audit history.
