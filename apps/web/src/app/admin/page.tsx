"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, LineChart, FileText,
  Globe, Send, ShieldAlert, CheckCircle2
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { ImageUploadZone } from "@/components/admin/ImageUploadZone";

type ActiveTab = "trade_idea" | "market_update" | "economy_outlook";

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>("trade_idea");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Trade Idea form ─────────────────────────────────────────────────────
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState("LONG");
  const [tradeType, setTradeType] = useState("Intraday");
  const [entryPrice, setEntryPrice] = useState("");
  const [sl, setSl] = useState("");
  const [rr, setRr] = useState("1:2");
  const [reason, setReason] = useState("");
  const [tps, setTps] = useState<string[]>([""]);
  const [ideaChartUrl, setIdeaChartUrl] = useState<string | null>(null);

  // ── Market Update form ──────────────────────────────────────────────────
  const [marketTicker, setMarketTicker] = useState("");
  const [marketReason, setMarketReason] = useState("");
  const [marketChartUrl, setMarketChartUrl] = useState<string | null>(null);

  // ── Economy Outlook form ────────────────────────────────────────────────
  const [econIndicator, setEconIndicator] = useState("");
  const [econExplanation, setEconExplanation] = useState("");
  const [econChartUrl, setEconChartUrl] = useState<string | null>(null);

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("znt_token");
    if (!stored) { router.push("/login"); return; }
    setToken(stored);
    try {
      const payload = JSON.parse(atob(stored.split(".")[1]));
      setAuthorized(payload.username === "admin");
    } catch {
      setAuthorized(false);
    }
  }, [router]);

  // ── Dynamic TP helpers ──────────────────────────────────────────────────
  const addTp = () => setTps([...tps, ""]);
  const removeTp = (i: number) => tps.length > 1 && setTps(tps.filter((_, idx) => idx !== i));
  const setTp = (i: number, v: string) => { const next = [...tps]; next[i] = v; setTps(next); };

  function clearMessages() { setSuccessMsg(""); setErrorMsg(""); }

  // ── Submit: Trade Idea ──────────────────────────────────────────────────
  async function handleTradeIdea(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const parsedTps = tps.map(Number).filter((n) => !isNaN(n) && n > 0);
      if (!parsedTps.length) throw new Error("At least one valid TP target is required");

      await apiRequest("/insights/trade-ideas", {
        method: "POST",
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          direction,
          trade_type: tradeType,
          entry_price: parseFloat(entryPrice),
          tp_levels: parsedTps,
          sl: parseFloat(sl),
          rr,
          reason,
          chart_url: ideaChartUrl ?? null,
        }),
      });

      setSuccessMsg(`Trade Idea for ${ticker.toUpperCase()} published!`);
      setTicker(""); setEntryPrice(""); setSl(""); setRr("1:2");
      setReason(""); setTps([""]); setIdeaChartUrl(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  }

  // ── Submit: Market Update ───────────────────────────────────────────────
  async function handleMarketUpdate(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await apiRequest("/insights/market-updates", {
        method: "POST",
        body: JSON.stringify({
          ticker: marketTicker.toUpperCase(),
          reason: marketReason,
          chart_url: marketChartUrl ?? null,
        }),
      });
      setSuccessMsg(`Market Update for ${marketTicker.toUpperCase()} published!`);
      setMarketTicker(""); setMarketReason(""); setMarketChartUrl(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  }

  // ── Submit: Economy Outlook ─────────────────────────────────────────────
  async function handleEconOutlook(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await apiRequest("/insights/economy-outlooks", {
        method: "POST",
        body: JSON.stringify({
          indicator: econIndicator.toUpperCase(),
          explanation: econExplanation,
          chart_url: econChartUrl ?? null,
        }),
      });
      setSuccessMsg(`Economic Outlook for ${econIndicator.toUpperCase()} published!`);
      setEconIndicator(""); setEconExplanation(""); setEconChartUrl(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  }

  // ── Loading / Access Denied screens ────────────────────────────────────
  if (authorized === null) {
    return (
      <main className="min-h-screen bg-graphite-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-terminal-yellow animate-ping" />
          <p className="text-xs text-white/50 uppercase tracking-widest">Resolving session…</p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-graphite-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full border border-terminal-red/30 bg-terminal-red/5 p-6 text-center rounded">
          <ShieldAlert className="mx-auto text-terminal-red mb-4" size={48} />
          <h1 className="text-xl font-bold uppercase tracking-wider text-terminal-red">Access Denied</h1>
          <p className="text-sm text-white/60 mt-3 mb-6">
            Only authorized administrators can access this publisher panel.
          </p>
          <Link href="/terminal" className="inline-flex items-center gap-2 border border-white/10 bg-graphite-900 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-black transition-colors">
            <ArrowLeft size={14} /> Back to Terminal
          </Link>
        </div>
      </main>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  const inputCls = "w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white placeholder-white/20 outline-none focus:border-terminal-yellow text-sm transition-colors";
  const selectCls = "w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm transition-colors";
  const labelCls = "block text-xs text-white/50 mb-1.5 uppercase tracking-wide font-semibold";
  const submitCls = "w-full h-11 bg-terminal-yellow font-bold text-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-terminal-amber transition-colors disabled:opacity-50 disabled:cursor-wait text-sm mt-6";

  const TABS = [
    { id: "trade_idea",       label: "Trade Idea",    icon: LineChart },
    { id: "market_update",    label: "Market Update", icon: FileText  },
    { id: "economy_outlook",  label: "Econ Outlook",  icon: Globe     },
  ] as const;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(247,201,72,0.06),transparent_40rem),linear-gradient(180deg,#050607,#090b0d_42%,#050607)] text-white">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-terminal-yellow/20 bg-black/92 backdrop-blur">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/terminal"
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow hover:text-terminal-yellow transition-all"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center bg-terminal-yellow font-black text-black text-sm">A</div>
              <div>
                <h1 className="text-base font-semibold">Publisher Control Panel</h1>
                <p className="text-xs text-white/42">Admin-only content publishing interface</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">

        {/* Feedback banners */}
        {successMsg && (
          <div className="mb-6 flex items-start gap-3 border border-terminal-green/30 bg-terminal-green/10 p-4 text-terminal-green rounded">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 border border-terminal-red/30 bg-terminal-red/10 p-4 text-terminal-red rounded">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{errorMsg}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[180px_1fr]">

          {/* Sidebar navigation */}
          <nav className="flex flex-col gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); clearMessages(); }}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs uppercase font-bold border text-left transition-all ${
                  activeTab === id
                    ? "bg-terminal-yellow text-black border-terminal-yellow"
                    : "border-white/10 text-white/70 hover:border-terminal-yellow/40 hover:bg-white/5"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          {/* Form card */}
          <div className="border border-white/10 bg-black/60 p-6 rounded backdrop-blur">

            {/* ── FORM A: Trade Idea ──────────────────────────────────── */}
            {activeTab === "trade_idea" && (
              <form onSubmit={handleTradeIdea} className="space-y-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-terminal-yellow pb-3 border-b border-white/10 flex items-center gap-2">
                  <LineChart size={16} /> New Trade Idea
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Ticker Symbol</label>
                    <input type="text" placeholder="BTCUSDT" value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Direction</label>
                    <select value={direction} onChange={(e) => setDirection(e.target.value)} className={selectCls}>
                      <option value="LONG">LONG 🟢</option>
                      <option value="SHORT">SHORT 🔴</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Trade Type</label>
                    <select value={tradeType} onChange={(e) => setTradeType(e.target.value)} className={selectCls}>
                      <option value="Scalping">Scalping</option>
                      <option value="Intraday">Intraday</option>
                      <option value="Swing">Swing</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Entry Price</label>
                    <input type="number" step="any" placeholder="68420.50" value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className={inputCls} required />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Stop Loss (SL)</label>
                    <input type="number" step="any" placeholder="67100" value={sl}
                      onChange={(e) => setSl(e.target.value)}
                      className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Risk : Reward</label>
                    <input type="text" placeholder="1:2.5" value={rr}
                      onChange={(e) => setRr(e.target.value)}
                      className={inputCls} required />
                  </div>
                </div>

                {/* Dynamic TP fields */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Take Profit Targets</label>
                    <button type="button" onClick={addTp}
                      className="flex items-center gap-1 text-[11px] font-bold text-terminal-yellow hover:text-terminal-amber">
                      <Plus size={12} /> Add TP
                    </button>
                  </div>
                  <div className="space-y-2">
                    {tps.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-12 text-xs text-white/40 font-mono shrink-0">TP {i + 1}</span>
                        <input type="number" step="any"
                          placeholder={i === tps.length - 1 ? "Full TP / Final Target" : "Target Price"}
                          value={v} onChange={(e) => setTp(i, e.target.value)}
                          className="flex-1 h-9 px-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-xs" required />
                        {tps.length > 1 && (
                          <button type="button" onClick={() => removeTp(i)}
                            className="p-1.5 border border-white/10 hover:border-terminal-red text-white/40 hover:text-terminal-red hover:bg-terminal-red/5 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart image upload */}
                <div>
                  <label className={labelCls}>Setup Chart / TradingView Screenshot</label>
                  <ImageUploadZone value={ideaChartUrl} onChange={setIdeaChartUrl} token={token} />
                </div>

                <div>
                  <label className={labelCls}>Trade Rationale</label>
                  <textarea placeholder="Describe the technical pattern, catalyst, or market structure backing this entry…"
                    rows={5} value={reason} onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm resize-none" required />
                </div>

                <button type="submit" disabled={loading} className={submitCls}>
                  <Send size={15} /> {loading ? "Publishing…" : "Publish Trade Idea"}
                </button>
              </form>
            )}

            {/* ── FORM B: Market Update ───────────────────────────────── */}
            {activeTab === "market_update" && (
              <form onSubmit={handleMarketUpdate} className="space-y-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-terminal-yellow pb-3 border-b border-white/10 flex items-center gap-2">
                  <FileText size={16} /> New Market Update
                </h2>

                <div>
                  <label className={labelCls}>Ticker / Index</label>
                  <input type="text" placeholder="BTC.D, USDT.D, TOTAL3, BTCUSDT…"
                    value={marketTicker} onChange={(e) => setMarketTicker(e.target.value)}
                    className={inputCls} required />
                </div>

                {/* Chart image upload */}
                <div>
                  <label className={labelCls}>Chart / Screenshot (Optional)</label>
                  <ImageUploadZone value={marketChartUrl} onChange={setMarketChartUrl} token={token} />
                </div>

                <div>
                  <label className={labelCls}>Analysis / Explanation</label>
                  <textarea placeholder="Explain market structure shifts, key trend levels, or short-term directional bias…"
                    rows={7} value={marketReason} onChange={(e) => setMarketReason(e.target.value)}
                    className="w-full p-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm resize-none" required />
                </div>

                <button type="submit" disabled={loading} className={submitCls}>
                  <Send size={15} /> {loading ? "Publishing…" : "Publish Market Update"}
                </button>
              </form>
            )}

            {/* ── FORM C: Economy Outlook ─────────────────────────────── */}
            {activeTab === "economy_outlook" && (
              <form onSubmit={handleEconOutlook} className="space-y-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-terminal-yellow pb-3 border-b border-white/10 flex items-center gap-2">
                  <Globe size={16} /> New Economic Outlook
                </h2>

                <div>
                  <label className={labelCls}>Macro Indicator / Event</label>
                  <input type="text" placeholder="CPI Release, PPI Data, FOMC Decision, NFP…"
                    value={econIndicator} onChange={(e) => setEconIndicator(e.target.value)}
                    className={inputCls} required />
                </div>

                {/* Chart image upload */}
                <div>
                  <label className={labelCls}>Supporting Chart / Screenshot (Optional)</label>
                  <ImageUploadZone value={econChartUrl} onChange={setEconChartUrl} token={token} />
                </div>

                <div>
                  <label className={labelCls}>Analysis / Explanation</label>
                  <textarea placeholder="Describe the data release, market expectations, sentiment impact, and volatility forecast for risk assets…"
                    rows={7} value={econExplanation} onChange={(e) => setEconExplanation(e.target.value)}
                    className="w-full p-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm resize-none" required />
                </div>

                <button type="submit" disabled={loading} className={submitCls}>
                  <Send size={15} /> {loading ? "Publishing…" : "Publish Economic Outlook"}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
