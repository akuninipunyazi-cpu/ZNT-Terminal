"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  Activity, Bell, Clock3, LogOut, Menu, Search,
  Wifi, WifiOff, X, Zap,
} from "lucide-react";
import Link from "next/link";
import { SignalTable, type SignalRow } from "@/components/terminal/SignalTable";
import { NewsPanel } from "@/components/terminal/NewsPanel";
import { useTerminalSocket } from "@/lib/realtime";

// ── Static data ───────────────────────────────────────────────────────────────

const TIMEFRAMES = ["15m", "30m", "1h", "4h", "1d", "1w"];

const flowRows = [
  ["Aggressive buy",  "62%",     "text-terminal-green"],
  ["Aggressive sell", "38%",     "text-terminal-red"],
  ["Spread pressure", "9.2 bps", "text-terminal-yellow"],
  ["Liquidity pull",  "low",     "text-terminal-cyan"],
];

const levelRows = [
  ["L0", "Universe",            1000, "bg-white/20"],
  ["L1", "Liquidity",            284, "bg-terminal-cyan"],
  ["L2", "Volume anomaly",        42, "bg-terminal-yellow"],
  ["L3", "Breakout + entropy",    18, "bg-terminal-amber"],
  ["L4", "Momentum verified",     12, "bg-terminal-green"],
];

// ── Component ─────────────────────────────────────────────────────────────────

export function TerminalShell() {
  const [timeframe, setTimeframe]   = useState("15m");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin]       = useState(false);
  const mobileMenuRef               = useRef<HTMLDivElement>(null);
  const realtime = useTerminalSocket(timeframe);

  // ── Admin detection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("znt_token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.username === "admin") setIsAdmin(true);
    } catch { /* ignore */ }
  }, []);

  // ── Close mobile menu on outside click ──────────────────────────────────
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [mobileMenuOpen]);

  // ── Signal rows ──────────────────────────────────────────────────────────
  const longRows: SignalRow[] = useMemo(() => {
    if (!realtime.data?.gainers) return [];
    return realtime.data.gainers.map((c: any) => ({
      symbol:        c.symbol,
      side:          "long",
      price:         c.price.toLocaleString(),
      anomalyScore:  c.score,
      entropy:       c.metrics.sample_entropy,
      liquidity:     "A",
      momentumLabel: c.metrics.organic_retail_probability > 50 ? "organic retail" : "maker activity",
      continuation:  c.metrics.continuation_probability,
    }));
  }, [realtime.data]);

  const shortRows: SignalRow[] = useMemo(() => {
    if (!realtime.data?.losers) return [];
    return realtime.data.losers.map((c: any) => ({
      symbol:        c.symbol,
      side:          "short",
      price:         c.price.toLocaleString(),
      anomalyScore:  c.score,
      entropy:       c.metrics.sample_entropy,
      liquidity:     "A",
      momentumLabel: c.metrics.organic_retail_probability > 50 ? "organic retail" : "maker activity",
      continuation:  c.metrics.continuation_probability,
    }));
  }, [realtime.data]);

  const momentumMetrics = useMemo(() => {
    const g = realtime.data?.gainers?.[0];
    if (!g) return [
      ["Organic retail",        0, "text-terminal-green"],
      ["Market maker activity", 0, "text-terminal-yellow"],
      ["Manipulation risk",     0, "text-terminal-red"],
      ["Continuation",          0, "text-terminal-cyan"],
    ];
    return [
      ["Organic retail",        g.metrics.organic_retail_probability,        "text-terminal-green"],
      ["Market maker activity", g.metrics.market_maker_activity_probability, "text-terminal-yellow"],
      ["Manipulation risk",     g.metrics.manipulation_risk_probability,     "text-terminal-red"],
      ["Continuation",          g.metrics.continuation_probability,          "text-terminal-cyan"],
    ];
  }, [realtime.data]);

  function logout() {
    window.localStorage.removeItem("znt_token");
    window.location.assign("/login");
  }

  // ── WS status dot (shared) ───────────────────────────────────────────────
  const WsDot = () => (
    <span className={`h-2 w-2 rounded-full shrink-0 ${
      realtime.connected ? "bg-terminal-green animate-pulse" : "bg-terminal-red"
    }`} />
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(247,201,72,0.14),transparent_26rem),linear-gradient(180deg,#050607,#090b0d_42%,#050607)] text-white">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-terminal-yellow/20 bg-black/92 backdrop-blur">

        {/* Main header row */}
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">

          {/* Logo */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-terminal-yellow font-black text-black">
            Z
          </div>

          {/* Brand name — hidden on very small screens */}
          <div className="hidden xs:block mr-1">
            <h1 className="text-sm font-bold leading-none">ZNT Terminal</h1>
            <p className="text-[10px] text-white/40">Screening desk</p>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-4 border-l border-white/10 ml-2 pl-4 text-xs uppercase font-semibold tracking-wider">
            <Link href="/terminal"          className="text-terminal-yellow">Screening</Link>
            <Link href="/terminal/view"     className="text-white/60 hover:text-terminal-yellow transition-colors">Chart View</Link>
            <Link href="/terminal/research" className="text-white/60 hover:text-terminal-yellow transition-colors">Research</Link>
            {isAdmin && (
              <Link href="/admin" className="text-white/36 hover:text-terminal-yellow transition-colors">Admin</Link>
            )}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* WS status — desktop */}
          <div className="hidden sm:flex items-center gap-2 px-3 h-9 border border-white/10 bg-graphite-900 text-xs font-mono select-none shrink-0">
            <WsDot />
            <span className={realtime.connected ? "text-terminal-green" : "text-terminal-red"}>
              {realtime.connected ? "LIVE" : "OFFLINE"}
            </span>
            {realtime.connected && realtime.latencyMs !== null && (
              <span className="text-white/36 border-l border-white/10 pl-2">
                {realtime.latencyMs}ms
              </span>
            )}
          </div>

          {/* WS status dot — mobile only */}
          <div className="sm:hidden flex items-center gap-1.5 shrink-0">
            <WsDot />
            <span className={`text-[10px] font-mono ${realtime.connected ? "text-terminal-green" : "text-terminal-red"}`}>
              {realtime.connected ? "LIVE" : "OFF"}
            </span>
          </div>

          {/* Action buttons */}
          <button aria-label="Search"
            className="flex h-9 w-9 items-center justify-center border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow/50 shrink-0">
            <Search size={16} />
          </button>
          <button aria-label="Alerts"
            className="hidden sm:flex h-9 w-9 items-center justify-center border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow/50 shrink-0">
            <Bell size={16} />
          </button>
          <button aria-label="Logout" onClick={logout}
            className="hidden sm:flex h-9 w-9 items-center justify-center border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow/50 shrink-0">
            <LogOut size={16} />
          </button>

          {/* Hamburger — mobile only */}
          <button
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden flex h-9 w-9 items-center justify-center border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow/50 shrink-0"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Timeframe strip — always visible below header */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2 sm:px-4 scrollbar-none">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`h-7 min-w-[2.5rem] shrink-0 px-2.5 text-xs font-semibold transition-colors ${
                tf === timeframe
                  ? "bg-terminal-yellow text-black"
                  : "border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow/50"
              }`}
            >
              {tf}
            </button>
          ))}
          <span className="ml-auto shrink-0 text-[10px] text-white/30 font-mono pr-1">
            {timeframe} · {realtime.connected ? "live" : "offline"}
          </span>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-t border-white/10 bg-black/95 px-4 py-3 flex flex-col gap-1"
          >
            <Link href="/terminal"          onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-semibold text-terminal-yellow border-b border-white/5">Screening</Link>
            <Link href="/terminal/view"     onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm text-white/70 border-b border-white/5">Chart View</Link>
            <Link href="/terminal/research" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm text-white/70 border-b border-white/5">Research</Link>
            {isAdmin && (
              <Link href="/admin"           onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm text-white/50 border-b border-white/5">Admin Panel</Link>
            )}
            <button onClick={logout} className="py-2 text-sm text-terminal-red/70 flex items-center gap-2 text-left">
              <LogOut size={14} /> Logout
            </button>
          </div>
        )}
      </header>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className="grid gap-3 p-3 lg:grid-cols-[1fr_16rem] lg:p-4">
        <section className="grid min-w-0 gap-3">

          {/* Row 1 — Momentum Verification & Engine Ladder */}
          <div className="grid gap-3 lg:grid-cols-2">

            {/* Momentum Verification */}
            <section className="border border-white/10 bg-black/70">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase text-white/80">
                  <Zap size={13} className="text-terminal-yellow" />
                  Momentum Verification
                </h2>
                <span className="flex items-center gap-1 text-[10px] text-white/42">
                  <Clock3 size={12} />{timeframe}
                </span>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-1">
                {momentumMetrics.map(([label, value, color]) => (
                  <div key={label} className="border border-white/10 bg-graphite-950 p-3">
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <span className="text-white/68 text-xs">{label}</span>
                      <span className={String(color)}>{value}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.08]">
                      <div className="h-1.5 bg-terminal-yellow" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Engine Ladder */}
            <section className="border border-white/10 bg-black/70">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase text-white/80">
                  <Activity size={13} className="text-terminal-yellow" />
                  Engine Ladder
                </h2>
                <span className="text-[10px] text-white/42 hidden sm:inline">config driven</span>
              </div>
              <div className="grid gap-2 p-3">
                {levelRows.map(([level, label, value, color], index) => (
                  <div
                    key={String(level)}
                    className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-2 sm:gap-3 border border-white/10 bg-graphite-950 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-terminal-yellow">{level}</span>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/72 truncate pr-2">{label}</span>
                        <span className="text-white shrink-0">{String(value)}</span>
                      </div>
                      <div className="mt-1.5 h-1 bg-white/[0.07]">
                        <div
                          className={`h-1 ${String(color)}`}
                          style={{ width: `${Math.max(8, 100 - index * 20)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-right text-[10px] text-white/36">pass</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Row 2 — Flow Monitor */}
          <section className="border border-white/10 bg-black/70">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <h2 className="text-xs font-semibold uppercase text-white/80">Flow Monitor</h2>
              <span className="text-[10px] text-terminal-cyan">BTCUSDT sample</span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
              {flowRows.map(([label, value, color]) => (
                <div key={label} className="border border-white/10 bg-graphite-950 p-3">
                  <p className="text-[10px] uppercase text-white/42">{label}</p>
                  <p className={`mt-2 text-xl font-semibold ${String(color)}`}>{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Row 3 — Watchlists */}
          <div className="grid gap-3 xl:grid-cols-2">
            <SignalTable title="Long Watchlist"  rows={longRows}  />
            <SignalTable title="Short Watchlist" rows={shortRows} />
          </div>
        </section>

        {/* News sidebar */}
        <aside className="flex flex-col gap-3 min-w-0">
          <NewsPanel latestNews={realtime.latestNews} />
        </aside>
      </div>
    </main>
  );
}
