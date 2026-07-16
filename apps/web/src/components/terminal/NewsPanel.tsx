import { useEffect, useState } from "react";
import { Newspaper, ExternalLink, Maximize2 } from "lucide-react";
import Link from "next/link";

type NewsItem = {
  id: string;
  title: string;
  url: string;
  published_at: string;
  description: string;
  source: string;
  isNew?: boolean;
};

type NewsPanelProps = {
  latestNews: NewsItem | null;
};

export function NewsPanel({ latestNews }: NewsPanelProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial news
  useEffect(() => {
    async function fetchInitialNews() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
        const res = await fetch(`${apiBase}/terminal/news?limit=25`);
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
    if (latestNews && latestNews.id) {
      setNews((prev) => {
        // Avoid duplicates
        if (prev.some((item) => item.id === latestNews.id)) {
          return prev;
        }
        const newArticle = { ...latestNews, isNew: true };
        const updated = [newArticle, ...prev];
        return updated.slice(0, 50); // Keep max 50 items
      });

      // Clear the "isNew" flag after 4 seconds to end the glow animation
      const timer = setTimeout(() => {
        setNews((prev) =>
          prev.map((item) => (item.id === latestNews.id ? { ...item, isNew: false } : item))
        );
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [latestNews]);

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
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col border border-white/10 bg-black/70 h-[380px] lg:h-[450px] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 bg-black/30">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-white/80">
          <Newspaper size={15} className="text-terminal-yellow" />
          Realtime Feed
        </h2>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-terminal-green animate-pulse" />
            <span className="text-[10px] text-white/42 uppercase">Live RSS</span>
          </span>
          <Link
            href="/news"
            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-terminal-yellow transition-colors"
            title="Full Screen News"
          >
            <Maximize2 size={13} />
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-white/42">
            Syncing news feeds...
          </div>
        ) : news.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-white/42">
            No news signals available
          </div>
        ) : (
          [...news]
            .sort((a, b) => {
              const ta = new Date(a.published_at).getTime();
              const tb = new Date(b.published_at).getTime();
              return (isNaN(ta) ? 0 : ta) - (isNaN(tb) ? 0 : tb);
            })
            .map((item) => (
              <div
                key={item.id}
                className={`p-2.5 border transition-all duration-500 bg-graphite-950/80 hover:bg-graphite-900 group ${
                  item.isNew
                    ? "border-terminal-yellow bg-terminal-yellow/5 shadow-[0_0_15px_rgba(247,201,72,0.15)]"
                    : "border-white/5 hover:border-terminal-yellow/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-white/5 border border-white/10 text-terminal-yellow uppercase tracking-wider">
                    {item.source}
                  </span>
                  <span className="text-[10px] text-white/36 font-mono">
                    {formatTime(item.published_at)}
                  </span>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs font-medium text-white/85 hover:text-terminal-yellow leading-relaxed group-hover:underline cursor-pointer"
                >
                  {item.title}
                  <ExternalLink size={10} className="inline ml-1 opacity-0 group-hover:opacity-60 transition-opacity" />
                </a>
                {item.description && (
                  <p className="mt-1.5 text-[10px] text-white/48 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
