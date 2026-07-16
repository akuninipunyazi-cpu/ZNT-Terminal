"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Newspaper, RadioTower } from "lucide-react";
import { useTerminalSocket } from "@/lib/realtime";

type NewsItem = {
  id: string;
  title: string;
  url: string;
  published_at: string;
  description: string;
  source: string;
  isNew?: boolean;
};

export default function NewsPage() {
  // We use "15m" timeframe for the socket connection to listen for news streams
  const realtime = useTerminalSocket("15m");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial historical news
  useEffect(() => {
    async function fetchInitialNews() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
        const res = await fetch(`${apiBase}/terminal/news?limit=100`);
        if (res.ok) {
          const data = await res.json();
          setNews(data);
        }
      } catch (err) {
        console.error("Failed to fetch initial news:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialNews();
  }, []);

  // Listen to live WebSocket news updates
  useEffect(() => {
    const latestNews = realtime.latestNews;
    if (latestNews && latestNews.id) {
      setNews((prev) => {
        if (prev.some((item) => item.id === latestNews.id)) {
          return prev;
        }
        const newArticle = { ...latestNews, isNew: true };
        const updated = [newArticle, ...prev];
        return updated.slice(0, 100); // Keep max 100 items on the full screen page
      });

      // Clear glow animation after 4 seconds
      const timer = setTimeout(() => {
        setNews((prev) =>
          prev.map((item) => (item.id === latestNews.id ? { ...item, isNew: false } : item))
        );
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [realtime.latestNews]);

  // Format date helper
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { 
        weekday: "short", 
        month: "short", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(247,201,72,0.08),transparent_40rem),linear-gradient(180deg,#050607,#090b0d_42%,#050607)] text-white">
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
                Z
              </div>
              <div>
                <h1 className="text-base font-semibold flex items-center gap-2">
                  ZNT News Feed
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-terminal-green animate-pulse" />
                    <span className="text-[9px] text-terminal-green uppercase font-mono tracking-wider">Live</span>
                  </span>
                </h1>
                <p className="text-xs text-white/42">Global aggregated cryptocurrency intelligence</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono border border-white/10 bg-graphite-950 px-3 py-1.5 select-none">
            <RadioTower size={14} className="text-terminal-yellow animate-pulse" />
            <span className="text-white/60">TAPE FEED: ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:py-10">
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
          <Newspaper size={22} className="text-terminal-yellow" />
          <h2 className="text-xl font-bold uppercase tracking-wider">Market Intelligence Feed</h2>
        </div>

        {loading ? (
          <div className="flex flex-col h-64 items-center justify-center gap-3 text-sm text-white/42">
            <span className="h-2 w-2 rounded-full bg-terminal-yellow animate-ping" />
            Synchronizing with RSS news channels...
          </div>
        ) : news.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-white/42 border border-dashed border-white/10 bg-black/40">
            No news signals available in the memory buffer
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <article
                key={item.id}
                className={`p-4 border transition-all duration-500 bg-black/50 hover:bg-graphite-950/80 group rounded ${
                  item.isNew
                    ? "border-terminal-yellow bg-terminal-yellow/5 shadow-[0_0_20px_rgba(247,201,72,0.1)] animate-pulse"
                    : "border-white/10 hover:border-terminal-yellow/30"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-terminal-yellow/10 border border-terminal-yellow/30 text-terminal-yellow uppercase tracking-wider rounded-sm">
                    {item.source}
                  </span>
                  <time className="text-xs text-white/36 font-mono">
                    {formatTime(item.published_at)}
                  </time>
                </div>
                
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-base font-semibold text-white group-hover:text-terminal-yellow leading-snug cursor-pointer transition-colors"
                >
                  {item.title}
                  <ExternalLink size={14} className="inline-flex ml-1.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </a>

                {item.description && (
                  <p className="mt-2.5 text-sm text-white/60 leading-relaxed font-sans">
                    {item.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
