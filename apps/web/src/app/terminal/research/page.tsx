"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LineChart, FileText, Globe, ExternalLink, Calendar, HelpCircle, Activity } from "lucide-react";
import { apiRequest } from "@/lib/api";

type Tab = "ideas" | "updates" | "outlooks";

type TradeIdea = {
  id: string;
  ticker: string;
  direction: string;
  trade_type: string;
  entry_price: number;
  tp_levels: number[];
  sl: number;
  rr: string;
  reason: string;
  chart_url?: string;
  created_at: string;
};

type MarketUpdate = {
  id: string;
  ticker: string;
  reason: string;
  created_at: string;
};

type EconomyOutlook = {
  id: string;
  indicator: string;
  explanation: string;
  created_at: string;
};

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ideas");
  const [ideas, setIdeas] = useState<TradeIdea[]>([]);
  const [updates, setUpdates] = useState<MarketUpdate[]>([]);
  const [outlooks, setOutlooks] = useState<EconomyOutlook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        if (activeTab === "ideas") {
          const res = await apiRequest<TradeIdea[]>("/insights/trade-ideas");
          setIdeas(res);
        } else if (activeTab === "updates") {
          const res = await apiRequest<MarketUpdate[]>("/insights/market-updates");
          setUpdates(res);
        } else if (activeTab === "outlooks") {
          const res = await apiRequest<EconomyOutlook[]>("/insights/economy-outlooks");
          setOutlooks(res);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analyst insights");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTab]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

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
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-terminal-yellow font-black text-black text-sm">
                R
              </div>
              <div>
                <h1 className="text-base font-semibold">ZNT Analyst Desk</h1>
                <p className="text-xs text-white/42">Market Updates, Economy Outlook & Trade Ideas</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-white/10 mb-6 overflow-x-auto select-none gap-2">
          {[
            { id: "ideas", label: "Trade Ideas", icon: LineChart },
            { id: "updates", label: "Market Updates", icon: FileText },
            { id: "outlooks", label: "Economy Outlook", icon: Globe }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-4 py-3 text-xs uppercase font-bold border-b-2 transition-all -mb-px shrink-0 ${
                  activeTab === tab.id
                    ? "border-terminal-yellow text-terminal-yellow"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 border border-terminal-red/30 bg-terminal-red/10 px-4 py-3 text-sm text-terminal-red rounded flex items-center gap-2">
            <Activity size={16} /> {error}
          </div>
        )}

        {/* Loader */}
        {loading ? (
          <div className="flex flex-col h-64 items-center justify-center gap-3 text-sm text-white/42">
            <span className="h-2 w-2 rounded-full bg-terminal-yellow animate-ping" />
            Loading analyst signals...
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Render Tab A: Trade Ideas */}
            {activeTab === "ideas" && (
              ideas.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-white/42 border border-dashed border-white/10 bg-black/40">
                  No active trade setups posted yet.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {ideas.map((idea) => (
                    <article key={idea.id} className="border border-white/10 bg-black/60 hover:bg-graphite-950/60 transition-all rounded overflow-hidden flex flex-col group">
                      
                      {/* Setup image preview */}
                      {idea.chart_url && (
                        <div className="relative aspect-video w-full bg-graphite-950 border-b border-white/10 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={idea.chart_url}
                            alt={`${idea.ticker} setup`}
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              // If image fails, hide it or replace with fallback
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <a
                            href={idea.chart_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 bg-black/80 hover:bg-black p-2 border border-white/10 text-white/80 hover:text-terminal-yellow transition-colors rounded-sm"
                            title="Open Full Image"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      )}

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Top Info Bar */}
                          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black uppercase text-white tracking-wide">{idea.ticker}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${
                                idea.direction === "LONG"
                                  ? "bg-terminal-green/10 border border-terminal-green/30 text-terminal-green"
                                  : "bg-terminal-red/10 border border-terminal-red/30 text-terminal-red"
                              }`}>
                                {idea.direction}
                              </span>
                            </div>
                            <span className="text-[10px] uppercase font-semibold text-white/42 border border-white/10 bg-graphite-950 px-2 py-0.5 rounded-sm">
                              {idea.trade_type}
                            </span>
                          </div>

                          {/* Key Levels Panel */}
                          <div className="grid grid-cols-3 gap-2 border border-white/10 bg-graphite-950/80 p-3 mb-4 rounded-sm text-center">
                            <div>
                              <p className="text-[10px] uppercase text-white/42 font-semibold">Entry</p>
                              <p className="text-sm font-bold text-white font-mono mt-0.5">{idea.entry_price}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase text-white/42 font-semibold">Stop Loss</p>
                              <p className="text-sm font-bold text-terminal-red font-mono mt-0.5">{idea.sl}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase text-white/42 font-semibold">Risk:Reward</p>
                              <p className="text-sm font-bold text-terminal-yellow font-mono mt-0.5">{idea.rr}</p>
                            </div>
                          </div>

                          {/* Take Profit target chips */}
                          <div className="mb-4">
                            <p className="text-[10px] uppercase text-white/42 font-semibold mb-1.5 tracking-wider">Target Targets</p>
                            <div className="flex flex-wrap gap-1.5">
                              {idea.tp_levels.map((level, i) => (
                                <span 
                                  key={i} 
                                  className="px-2.5 py-1 text-xs bg-terminal-green/5 border border-terminal-green/20 text-terminal-green font-mono rounded-sm"
                                >
                                  T{i + 1}: <strong className="text-white ml-0.5">{level}</strong>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Reason */}
                          <p className="text-xs text-white/70 leading-relaxed font-sans mb-4 whitespace-pre-line border-t border-dashed border-white/10 pt-3">
                            {idea.reason}
                          </p>
                        </div>

                        {/* Timestamp Footer */}
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/36 border-t border-white/5 pt-3">
                          <Calendar size={12} />
                          <span>Published {formatDate(idea.created_at)}</span>
                        </div>
                      </div>

                    </article>
                  ))}
                </div>
              )
            )}

            {/* Render Tab B: Market Updates */}
            {activeTab === "updates" && (
              updates.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-white/42 border border-dashed border-white/10 bg-black/40">
                  No market structural updates posted yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map((update) => (
                    <article key={update.id} className="border border-white/10 bg-black/60 p-4 rounded backdrop-blur">
                      <div className="flex items-center justify-between gap-3 mb-3 border-b border-dashed border-white/10 pb-3 flex-wrap">
                        <span className="px-3 py-1 text-xs font-black bg-terminal-yellow/10 border border-terminal-yellow/30 text-terminal-yellow uppercase tracking-wider rounded-sm">
                          INDEX UPDATE: {update.ticker}
                        </span>
                        <time className="text-xs text-white/36 font-mono flex items-center gap-1">
                          <Calendar size={13} /> {formatDate(update.created_at)}
                        </time>
                      </div>
                      <p className="text-sm text-white/88 leading-relaxed font-sans whitespace-pre-line">
                        {update.reason}
                      </p>
                    </article>
                  ))}
                </div>
              )
            )}

            {/* Render Tab C: Economy Outlooks */}
            {activeTab === "outlooks" && (
              outlooks.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-white/42 border border-dashed border-white/10 bg-black/40">
                  No macroeconomic updates posted yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {outlooks.map((outlook) => (
                    <article key={outlook.id} className="border border-white/10 bg-black/60 p-4 rounded backdrop-blur">
                      <div className="flex items-center justify-between gap-3 mb-3 border-b border-dashed border-white/10 pb-3 flex-wrap">
                        <span className="px-3 py-1 text-xs font-black bg-terminal-cyan/10 border border-terminal-cyan/30 text-terminal-cyan uppercase tracking-wider rounded-sm">
                          MACRO: {outlook.indicator}
                        </span>
                        <time className="text-xs text-white/36 font-mono flex items-center gap-1">
                          <Calendar size={13} /> {formatDate(outlook.created_at)}
                        </time>
                      </div>
                      <p className="text-sm text-white/88 leading-relaxed font-sans whitespace-pre-line">
                        {outlook.explanation}
                      </p>
                    </article>
                  ))}
                </div>
              )
            )}

          </div>
        )}
      </div>
    </main>
  );
}
