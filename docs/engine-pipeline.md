# Screening Engine Pipeline

The engine is one code path with per-timeframe config.

## Level 0: Universe

Start from active exchange pairs, usually USDT pairs. The first production target is approximately 1,000 symbols across exchanges.

## Level 1: Liquidity Filter

Reject symbols below minimum quote volume, liquidity score, or above maximum spread.

## Level 2: Volume Anomaly

Compare current volume to rolling baseline. Candidates need a minimum z-score.

## Level 3: Breakout And Entropy

Detect breakout or breakdown against the configured lookback window. Then compute Sample Entropy on recent returns. High entropy means the move is too random or chaotic for clean ranking.

## Level 4: Momentum Verification

Generate probability labels:

- organic retail probability
- market maker activity probability
- manipulation risk probability
- continuation probability

News-driven verification is intentionally excluded from the first version.

## Level 5: Ranking

Rank long watchlist and short watchlist separately. Output is a screening watchlist, not trading advice.
