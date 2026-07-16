"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, LineChart, FileText, Globe, Send, ShieldAlert, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/api";

type ActiveTab = "trade_idea" | "market_update" | "economy_outlook";

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>("trade_idea");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Trade Idea Form State
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState("LONG");
  const [tradeType, setTradeType] = useState("Intraday");
  const [entryPrice, setEntryPrice] = useState("");
  const [sl, setSl] = useState("");
  const [rr, setRr] = useState("1:2");
  const [reason, setReason] = useState("");
  const [chartUrl, setChartUrl] = useState("");
  const [tps, setTps] = useState<string[]>([""]); // starts with 1 blank TP input

  // Market Update Form State
  const [marketTicker, setMarketTicker] = useState("");
  const [marketReason, setMarketReason] = useState("");

  // Economy Outlook Form State
  const [econIndicator, setEconIndicator] = useState("");
  const [econExplanation, setEconExplanation] = useState("");

  // Authentication validation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = window.localStorage.getItem("znt_token");
      if (!storedToken) {
        router.push("/login");
        return;
      }
      setToken(storedToken);
      try {
        const payload = JSON.parse(atob(storedToken.split(".")[1]));
        if (payload.username === "admin") {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        setAuthorized(false);
      }
    }
  }, [router]);

  // Handle Dynamic TP Operations
  const addTpField = () => setTps([...tps, ""]);
  const removeTpField = (index: number) => {
    if (tps.length > 1) {
      setTps(tps.filter((_, i) => i !== index));
    }
  };
  const handleTpChange = (index: number, val: string) => {
    const updated = [...tps];
    updated[index] = val;
    setTps(updated);
  };

  // Submit Handlers
  async function handlePostTradeIdea(e: FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setLoading(true);

    try {
      // Filter out empty TPs and convert to float numbers
      const parsedTps = tps
        .map((val) => parseFloat(val))
        .filter((num) => !isNaN(num));

      if (parsedTps.length === 0) {
        throw new Error("You must specify at least one valid Take Profit (TP) target");
      }

      await apiRequest("/insights/trade-ideas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          direction,
          trade_type: tradeType,
          entry_price: parseFloat(entryPrice),
          tp_levels: parsedTps,
          sl: parseFloat(sl),
          rr,
          reason,
          chart_url: chartUrl || null
        })
      });

      setSuccessMsg(`Trade Idea for ${ticker.toUpperCase()} published successfully!`);
      // Reset form fields
      setTicker("");
      setEntryPrice("");
      setSl("");
      setRr("1:2");
      setReason("");
      setChartUrl("");
      setTps([""]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to publish trade idea");
    } finally {
      setLoading(false);
    }
  }

  async function handlePostMarketUpdate(e: FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setLoading(true);

    try {
      await apiRequest("/insights/market-updates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ticker: marketTicker.toUpperCase(),
          reason: marketReason
        })
      });

      setSuccessMsg(`Market Update for ${marketTicker.toUpperCase()} published successfully!`);
      setMarketTicker("");
      setMarketReason("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to publish market update");
    } finally {
      setLoading(false);
    }
  }

  async function handlePostEconomyOutlook(e: FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setLoading(true);

    try {
      await apiRequest("/insights/economy-outlooks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          indicator: econIndicator.toUpperCase(),
          explanation: econExplanation
        })
      });

      setSuccessMsg(`Economic Outlook for ${econIndicator.toUpperCase()} published successfully!`);
      setEconIndicator("");
      setEconExplanation("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to publish economy outlook");
    } finally {
      setLoading(false);
    }
  }

  // Waiting for authentication resolution
  if (authorized === null) {
    return (
      <main className="min-h-screen bg-graphite-950 text-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-terminal-yellow animate-ping" />
          <p className="text-xs text-white/50 uppercase tracking-widest">Resolving Session...</p>
        </div>
      </main>
    );
  }

  // Access Denied screen
  if (authorized === false) {
    return (
      <main className="min-h-screen bg-graphite-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full border border-terminal-red/30 bg-terminal-red/5 p-6 text-center rounded">
          <ShieldAlert className="mx-auto text-terminal-red mb-4" size={48} />
          <h1 className="text-xl font-bold uppercase tracking-wider text-terminal-red">Access Denied</h1>
          <p className="text-sm text-white/60 mt-3 mb-6">
            Only authorized administrators can access this publisher panel.
          </p>
          <Link
            href="/terminal"
            className="inline-flex items-center gap-2 border border-white/10 bg-graphite-900 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-black transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Terminal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(247,201,72,0.06),transparent_40rem),linear-gradient(180deg,#050607,#090b0d_42%,#050607)] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-terminal-yellow/20 bg-black/92 backdrop-blur">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/terminal"
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-graphite-900 text-white/70 hover:border-terminal-yellow hover:text-terminal-yellow transition-all"
              title="Back to Terminal"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center bg-terminal-yellow font-black text-black text-sm">
                A
              </div>
              <div>
                <h1 className="text-base font-semibold">Publisher Control Panel</h1>
                <p className="text-xs text-white/42">Admin publishing interface</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content Body */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        
        {/* Banner Messages */}
        {successMsg && (
          <div className="mb-6 flex items-start gap-3 border border-terminal-green/30 bg-terminal-green/10 p-4 rounded text-terminal-green">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 border border-terminal-red/30 bg-terminal-red/10 p-4 rounded text-terminal-red">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{errorMsg}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          {/* Form Selector Sidebar */}
          <nav className="flex flex-col gap-2">
            {[
              { id: "trade_idea", label: "Trade Idea", icon: LineChart },
              { id: "market_update", label: "Market Update", icon: FileText },
              { id: "economy_outlook", label: "Econ Outlook", icon: Globe }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as ActiveTab);
                    setSuccessMsg("");
                    setErrorMsg("");
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs uppercase font-semibold border text-left transition-all ${
                    activeTab === tab.id
                      ? "bg-terminal-yellow text-black border-terminal-yellow"
                      : "border-white/10 text-white/70 hover:border-terminal-yellow/40 hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Publisher Form Area */}
          <div className="border border-white/10 bg-black/60 p-5 rounded backdrop-blur">
            
            {/* Form A: Trade Idea */}
            {activeTab === "trade_idea" && (
              <form onSubmit={handlePostTradeIdea} className="space-y-4">
                <h2 className="text-base font-bold uppercase tracking-wider text-terminal-yellow pb-2 border-b border-white/10 flex items-center gap-2">
                  <LineChart size={18} /> Publish New Trade Idea
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Ticker Symbol</label>
                    <input
                      type="text"
                      placeholder="e.g. BTCUSDT"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      className="w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white placeholder-white/20 outline-none focus:border-terminal-yellow text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Direction</label>
                    <select
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                      className="w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm"
                    >
                      <option value="LONG">LONG 🟢</option>
                      <option value="SHORT">SHORT 🔴</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Trade Type</label>
                    <select
                      value={tradeType}
                      onChange={(e) => setTradeType(e.target.value)}
                      className="w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm"
                    >
                      <option value="Scalping">Scalping (Quick)</option>
                      <option value="Intraday">Intraday (Day trade)</option>
                      <option value="Swing">Swing (Days/Weeks)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Entry Price</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 68420.5"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Stop Loss (SL)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 67100"
                      value={sl}
                      onChange={(e) => setSl(e.target.value)}
                      className="w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Risk-to-Reward Ratio (RR)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1:2.5"
                      value={rr}
                      onChange={(e) => setRr(e.target.value)}
                      className="w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Take Profit target fields */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-white/60 uppercase tracking-wide">Take Profit (TP) Targets</label>
                    <button
                      type="button"
                      onClick={addTpField}
                      className="flex items-center gap-1 text-[11px] font-bold text-terminal-yellow hover:text-terminal-amber"
                    >
                      <Plus size={12} /> Add Target
                    </button>
                  </div>
                  <div className="space-y-2">
                    {tps.map((val, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-white/42 w-12 font-mono">TP {index + 1}:</span>
                        <input
                          type="number"
                          step="any"
                          placeholder={index === tps.length - 1 ? "Full TP Price" : "TP Target Price"}
                          value={val}
                          onChange={(e) => handleTpChange(index, e.target.value)}
                          className="flex-1 h-9 px-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-xs"
                          required
                        />
                        {tps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTpField(index)}
                            className="p-2 border border-white/10 hover:border-terminal-red text-white/50 hover:text-terminal-red hover:bg-terminal-red/5"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">TradingView Chart URL / Image Link</label>
                  <input
                    type="url"
                    placeholder="https://s3.tradingview.com/snapshots/...png"
                    value={chartUrl}
                    onChange={(e) => setChartUrl(e.target.value)}
                    className="w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Trade Rationale / Reason</label>
                  <textarea
                    placeholder="Provide a detailed breakdown of the technical patterns, volume anomalies, or catalyst indicators backing this entry..."
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm custom-scrollbar"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-terminal-yellow font-semibold text-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-terminal-amber transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <Send size={16} /> {loading ? "Publishing Idea..." : "Publish Trade Idea"}
                </button>
              </form>
            )}

            {/* Form B: Market Update */}
            {activeTab === "market_update" && (
              <form onSubmit={handlePostMarketUpdate} className="space-y-4">
                <h2 className="text-base font-bold uppercase tracking-wider text-terminal-yellow pb-2 border-b border-white/10 flex items-center gap-2">
                  <FileText size={18} /> Publish Market Update
                </h2>

                <div>
                  <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Ticker / Index Name</label>
                  <input
                    type="text"
                    placeholder="e.g. BTC.D, USDT.D, TOTAL3, BTCUSDT"
                    value={marketTicker}
                    onChange={(e) => setMarketTicker(e.target.value)}
                    className="w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white placeholder-white/20 outline-none focus:border-terminal-yellow text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Market Update Reason / Analysis</label>
                  <textarea
                    placeholder="Explain the macro structural shifts, trend reversals, or key levels to watch..."
                    rows={8}
                    value={marketReason}
                    onChange={(e) => setMarketReason(e.target.value)}
                    className="w-full p-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm custom-scrollbar"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-terminal-yellow font-semibold text-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-terminal-amber transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <Send size={16} /> {loading ? "Publishing Update..." : "Publish Market Update"}
                </button>
              </form>
            )}

            {/* Form C: Economy Outlook */}
            {activeTab === "economy_outlook" && (
              <form onSubmit={handlePostEconomyOutlook} className="space-y-4">
                <h2 className="text-base font-bold uppercase tracking-wider text-terminal-yellow pb-2 border-b border-white/10 flex items-center gap-2">
                  <Globe size={18} /> Publish Economic Outlook
                </h2>

                <div>
                  <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Macro Indicator / Catalyst</label>
                  <input
                    type="text"
                    placeholder="e.g. CPI Release, PPI Inflation, FOMC Meeting Rates"
                    value={econIndicator}
                    onChange={(e) => setEconIndicator(e.target.value)}
                    className="w-full h-10 px-3 bg-graphite-950 border border-white/12 text-white placeholder-white/20 outline-none focus:border-terminal-yellow text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1 uppercase tracking-wide">Analysis / Explanation</label>
                  <textarea
                    placeholder="Describe what data has been released, expectations, market sentiment impact, and potential volatility forecasts for risk-on assets..."
                    rows={8}
                    value={econExplanation}
                    onChange={(e) => setEconExplanation(e.target.value)}
                    className="w-full p-3 bg-graphite-950 border border-white/12 text-white outline-none focus:border-terminal-yellow text-sm custom-scrollbar"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-terminal-yellow font-semibold text-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-terminal-amber transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <Send size={16} /> {loading ? "Publishing Outlook..." : "Publish Economic Outlook"}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
