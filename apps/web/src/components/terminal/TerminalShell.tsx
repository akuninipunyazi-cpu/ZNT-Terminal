"use client";

import { useMemo, useState, useEffect } from "react";
import { Activity, Bell, Clock3, LogOut, Search, Zap } from "lucide-react";
import Link from "next/link";
import { MarketChart } from "@/components/terminal/MarketChart";
import { SignalTable, type SignalRow } from "@/components/terminal/SignalTable";
import { NewsPanel } from "@/components/terminal/NewsPanel";
import { useTerminalSocket } from "@/lib/realtime";


const timeframes = ["15m", "30m", "1h", "4h", "1d", "1w"];


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

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("znt_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.username === "admin") {
            setIsAdmin(true);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

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
            <div className="ml-6 hidden md:flex items-center gap-3 border-l border-white/10 pl-6 text-xs uppercase font-semibold tracking-wider">
              <Link href="/terminal" className="text-terminal-yellow">Screening</Link>
              <Link href="/terminal/research" className="text-white/60 hover:text-terminal-yellow transition-colors">Research</Link>
              {isAdmin && (
                <Link href="/admin" className="text-white/36 hover:text-terminal-yellow transition-colors">Admin Panel</Link>
              )}
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
            {/* Live Connection Status */}
            <div className="hidden sm:flex items-center gap-2 px-3 h-9 border border-white/10 bg-graphite-900 text-xs font-mono select-none">
              <span className={`h-1.5 w-1.5 rounded-full ${realtime.connected ? 'bg-terminal-green animate-pulse' : 'bg-terminal-red'}`} />
              <span className={realtime.connected ? 'text-terminal-green' : 'text-terminal-red'}>
                {realtime.connected ? 'WS CONNECTED' : 'OFFLINE'}
              </span>
              {realtime.connected && realtime.latencyMs !== null && (
                <span className="text-white/36 border-l border-white/10 pl-2 ml-1">
                  {realtime.latencyMs}ms
                </span>
              )}
            </div>

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
      </header>

      <div className="grid gap-3 p-3 lg:grid-cols-[1fr_16rem] lg:p-4">
        <section className="grid min-w-0 gap-3">


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

        <aside className="flex flex-col gap-3 lg:w-64 min-w-0">
          <NewsPanel latestNews={realtime.latestNews} />
        </aside>
      </div>

    </main>
  );
}
