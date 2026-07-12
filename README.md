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

## Engineering the Engine (Customizing Algorithms & Math)

If you want to customize or develop the mathematical formulas, statistics, physics (entropy), and scoring weights of the screening engine, here is where they are located:

### 1. Adjusting Thresholds & Configuration (Without changing code)
* **File**: [configs/engine/timeframes.yaml](./configs/engine/timeframes.yaml)
  * Configure parameters like `min_quote_volume`, `min_liquidity_score`, `max_spread_bps`, `volume_window`, `volume_zscore`, `breakout_window`, `max_sample_entropy`, `max_ranked` for each timeframe.

### 2. Customizing Mathematical & Statistical Logic (Python Code)
All algorithm codes are located inside the `services/screening_engine/` directory:

* **Sample Entropy (Information Theory/Physics)**: [services/screening_engine/entropy/sample_entropy.py](./services/screening_engine/entropy/sample_entropy.py)
  * Measures price regularity/randomness using Chebyshev distance.
* **Level 1 - Liquidity Filter**: [services/screening_engine/pipeline/level_1_liquidity.py](./services/screening_engine/pipeline/level_1_liquidity.py)
  * Filters coins based on transaction volume and spread size.
* **Level 2 - Volume Anomaly (Z-Score)**: [services/screening_engine/pipeline/level_2_volume_anomaly.py](./services/screening_engine/pipeline/level_2_volume_anomaly.py)
  * Standard deviation analysis for volume spike detection.
* **Level 3 - Breakout Envelope**: [services/screening_engine/pipeline/level_3_breakout_entropy.py](./services/screening_engine/pipeline/level_3_breakout_entropy.py)
  * Detects price breakouts or breakdowns compared to historical range.
* **Level 4 - Momentum Verification (Linear Weighting)**: [services/screening_engine/pipeline/level_4_momentum_verification.py](./services/screening_engine/pipeline/level_4_momentum_verification.py)
  * Calculates probabilities for retail momentum, maker activity, and risk.
* **Level 5 - Composite Scoring & Ranking**: [services/screening_engine/pipeline/level_5_ranking.py](./services/screening_engine/pipeline/level_5_ranking.py)
  * The final scoring formula that sorts candidates in the Watchlists.
