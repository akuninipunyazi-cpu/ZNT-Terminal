"use client";

import { useMemo, useState } from "react";
import { Activity, Bell, Clock3, LogOut, RadioTower, Search, Zap } from "lucide-react";
import { MarketChart } from "@/components/terminal/MarketChart";
import { SignalTable, type SignalRow } from "@/components/terminal/SignalTable";
import { StatusRail } from "@/components/terminal/StatusRail";
import { useTerminalSocket } from "@/lib/realtime";

const timeframes = ["15m", "30m", "1h", "4h", "1d", "1w"];

const tape = [
  ["BTC", "+1.82%", "68,420.50", "up"],
  ["ETH", "+0.74%", "3,812.20", "up"],
  ["SOL", "+3.11%", "174.22", "up"],
  ["WLD", "-2.46%", "4.18", "down"],
  ["INJ", "+4.92%", "28.74", "up"],
  ["MEME", "-5.18%", "0.0182", "down"],
  ["BNB", "+0.38%", "612.10", "up"],
  ["SEI", "+2.21%", "0.61", "up"]
];

const flowRows = [
  ["Aggressive buy", "62%", "text-terminal-green"],
  ["Aggressive sell", "38%", "text-terminal-red"],
  ["Spread pressure", "9.2 bps", "text-terminal-yellow"],
  ["Liquidity pull", "low", "text-terminal-cyan"]
];

const levelRows = [
  ["L0", "Universe", 1000, "bg-white/20"],
  ["L1", "Liquidity", 284, "bg-terminal-cyan"],
  ["L2", "Volume anomaly", 42, "bg-terminal-yellow"],
  ["L3", "Breakout + entropy", 18, "bg-terminal-amber"],
  ["L4", "Momentum verified", 12, "bg-terminal-green"]
];

export function TerminalShell() {
  const [timeframe, setTimeframe] = useState("15m");
  const realtime = useTerminalSocket(timeframe);

  const longRows: SignalRow[] = useMemo(() => {
    if (!realtime.data?.gainers) return [];
    return realtime.data.gainers.map((c: any) => ({
      symbol: c.symbol,
      side: "long",
      price: c.price.toLocaleString(),
      anomalyScore: c.score,
      entropy: c.metrics.sample_entropy,
      liquidity: "A", // Mocked for UI
      momentumLabel: c.metrics.organic_retail_probability > 50 ? "organic retail" : "maker activity",
      continuation: c.metrics.continuation_probability
    }));
  }, [realtime.data]);

  const shortRows: SignalRow[] = useMemo(() => {
    if (!realtime.data?.losers) return [];
    return realtime.data.losers.map((c: any) => ({
      symbol: c.symbol,
      side: "short",
      price: c.price.toLocaleString(),
      anomalyScore: c.score,
      entropy: c.metrics.sample_entropy,
      liquidity: "A", // Mocked for UI
      momentumLabel: c.metrics.organic_retail_probability > 50 ? "organic retail" : "maker activity",
      continuation: c.metrics.continuation_probability
    }));
  }, [realtime.data]);

  const momentumMetrics = useMemo(() => {
    const topGainer = realtime.data?.gainers?.[0];
    if (!topGainer) return [
      ["Organic retail", 0, "text-terminal-green"],
      ["Market maker activity", 0, "text-terminal-yellow"],
      ["Manipulation risk", 0, "text-terminal-red"],
      ["Continuation", 0, "text-terminal-cyan"]
    ];

    return [
      ["Organic retail", topGainer.metrics.organic_retail_probability, "text-terminal-green"],
      ["Market maker activity", topGainer.metrics.market_maker_activity_probability, "text-terminal-yellow"],
      ["Manipulation risk", topGainer.metrics.manipulation_risk_probability, "text-terminal-red"],
      ["Continuation", topGainer.metrics.continuation_probability, "text-terminal-cyan"]
    ];
  }, [realtime.data]);

  function logout() {
    window.localStorage.removeItem("znt_token");
    window.location.assign("/login");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(247,201,72,0.14),transparent_26rem),linear-gradient(180deg,#050607,#090b0d_42%,#050607)] text-white">
      <header className="sticky top-0 z-20 border-b border-terminal-yellow/20 bg-black/92 backdrop-blur">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-terminal-yellow font-black text-black">
              Z
            </div>
            <div>
              <h1 className="text-base font-semibold">ZNT Terminal</h1>
              <p className="text-xs text-white/42">Z Nexus Trade screening desk</p>
            </div>
          </div>

          <div className="order-3 flex w-full items-center gap-2 overflow-x-auto sm:order-none sm:w-auto">
            {timeframes.map((item) => (
              <button
                key={item}
                onClick={() => setTimeframe(item)}
                className={
                  item === timeframe
                    ? "h-9 min-w-12 bg-terminal-yellow px-3 text-sm font-semibold text-black"
                    : "h-9 min-w-12 border border-white/10 bg-graphite-900 px-3 text-sm text-white/70 hover:border-terminal-yellow/50"
                }
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow/50"
            >
              <Search size={17} />
            </button>
            <button
              aria-label="Alerts"
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow/50"
            >
              <Bell size={17} />
            </button>
            <button
              aria-label="Logout"
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow/50"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
        <div className="flex h-9 items-center gap-2 overflow-hidden border-t border-white/10 bg-graphite-950/90 px-3 text-xs sm:px-4">
          <div className="flex shrink-0 items-center gap-2 pr-2 text-terminal-yellow">
            <RadioTower size={14} />
            <span className="font-semibold uppercase">Live Tape</span>
          </div>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {tape.map(([symbol, change, price, direction]) => (
              <div
                key={symbol}
                className="flex shrink-0 items-center gap-2 border-r border-white/10 pr-3"
              >
                <span className="font-semibold text-white">{symbol}</span>
                <span className="text-white/48">{price}</span>
                <span
                  className={
                    direction === "up" ? "text-terminal-green" : "text-terminal-red"
                  }
                >
                  {change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-3 p-3 lg:grid-cols-[1fr_16rem] lg:p-4">
        <section className="grid min-w-0 gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Universe", "1,000", "tracked pairs", "+18"],
              ["Liquidity Pass", "284", "clean markets", "+7"],
              ["Anomaly Burst", "42", "volume spikes", "+11"],
              ["Ranked Signals", "12", "watchlist outputs", "-3"]
            ].map(([label, value, hint, delta]) => (
              <div
                key={label}
                className="relative overflow-hidden border border-white/10 bg-black/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-terminal-yellow/70 to-transparent" />
                <p className="text-xs uppercase text-white/42">{label}</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <strong className="text-2xl text-white">{value}</strong>
                  <div className="text-right">
                    <span
                      className={
                        String(delta).startsWith("-")
                          ? "block text-xs text-terminal-red"
                          : "block text-xs text-terminal-green"
                      }
                    >
                      {delta}
                    </span>
                    <span className="text-xs text-white/42">{hint}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_0.82fr]">
            <MarketChart />

            <section className="border border-white/10 bg-black/70">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-white/80">
                  <Zap size={15} className="text-terminal-yellow" />
                  Momentum Verification
                </h2>
                <span className="flex items-center gap-1 text-xs text-white/42">
                  <Clock3 size={14} />
                  {timeframe}
                </span>
              </div>
              <div className="grid gap-2 p-3">
                {momentumMetrics.map(([label, value, color]) => (
                  <div key={label} className="border border-white/10 bg-graphite-950 p-3">
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <span className="text-white/68">{label}</span>
                      <span className={String(color)}>{value}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.08]">
                      <div
                        className="h-2 bg-terminal-yellow"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="border border-white/10 bg-black/70">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-white/80">
                  <Activity size={15} className="text-terminal-yellow" />
                  Engine Ladder
                </h2>
                <span className="text-xs text-white/42">single engine / config driven</span>
              </div>
              <div className="grid gap-2 p-3">
                {levelRows.map(([level, label, value, color], index) => (
                  <div
                    key={String(level)}
                    className="grid grid-cols-[3rem_1fr_4rem] items-center gap-3 border border-white/10 bg-graphite-950 px-3 py-2"
                  >
                    <span className="font-semibold text-terminal-yellow">{level}</span>
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/72">{label}</span>
                        <span className="text-white">{String(value)}</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-white/[0.07]">
                        <div
                          className={`h-1.5 ${String(color)}`}
                          style={{ width: `${Math.max(8, 100 - index * 20)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-right text-xs text-white/36">pass</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-white/10 bg-black/70">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <h2 className="text-sm font-semibold uppercase text-white/80">
                  Flow Monitor
                </h2>
                <span className="text-xs text-terminal-cyan">BTCUSDT sample</span>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {flowRows.map(([label, value, color]) => (
                  <div key={label} className="border border-white/10 bg-graphite-950 p-3">
                    <p className="text-xs uppercase text-white/42">{label}</p>
                    <p className={`mt-2 text-2xl font-semibold ${String(color)}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <SignalTable title="Long Watchlist" rows={longRows} />
            <SignalTable title="Short Watchlist" rows={shortRows} />
          </div>
        </section>

        <StatusRail
          connected={realtime.connected}
          lastEvent={realtime.lastEvent}
          latencyMs={realtime.latencyMs}
        />
      </div>
    </main>
  );
}
