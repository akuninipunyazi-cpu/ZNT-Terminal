"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import Link from "next/link";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
} from "lightweight-charts";
import {
  ArrowLeft,
  Search,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  Activity,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const BINANCE_REST = "https://api.binance.com";
const BINANCE_WS   = "wss://stream.binance.com:9443/ws";

const TIMEFRAMES = [
  { label: "1m",  interval: "1m"  },
  { label: "5m",  interval: "5m"  },
  { label: "15m", interval: "15m" },
  { label: "30m", interval: "30m" },
  { label: "1h",  interval: "1h"  },
  { label: "4h",  interval: "4h"  },
  { label: "1d",  interval: "1d"  },
  { label: "1w",  interval: "1w"  },
];

// ── Candle colour palette (ZNT theme) ────────────────────────────────────────
const CANDLE_UP_COLOR   = "#F7C948"; // terminal-yellow
const CANDLE_DOWN_COLOR = "#FFFFFF"; // white
const CANDLE_UP_WICK    = "#F7C948";
const CANDLE_DOWN_WICK  = "rgba(255,255,255,0.55)";

// ── Types ────────────────────────────────────────────────────────────────────

type SymbolInfo = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
};

// ── Helper: fetch kline history from Binance ─────────────────────────────────

async function fetchKlines(
  symbol: string,
  interval: string,
  limit = 500
): Promise<CandlestickData[]> {
  const url = `${BINANCE_REST}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  const raw: any[][] = await res.json();
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000) as Time,
    open:  parseFloat(k[1]),
    high:  parseFloat(k[2]),
    low:   parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TerminalViewPage() {
  // Chart refs
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const wsRef        = useRef<WebSocket | null>(null);

  // State
  const [symbol,    setSymbol]    = useState("BTCUSDT");
  const [interval,  setIntervalTF] = useState("15m");
  const [price,     setPrice]     = useState<string>("");
  const [priceDir,  setPriceDir]  = useState<"up" | "down" | "">("");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Symbol search
  const [allSymbols, setAllSymbols] = useState<SymbolInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Load all USDT pairs from Binance exchange info ─────────────────────────
  useEffect(() => {
    fetch(`${BINANCE_REST}/api/v3/exchangeInfo`)
      .then((r) => r.json())
      .then((data) => {
        const usdt: SymbolInfo[] = data.symbols
          .filter((s: any) => s.quoteAsset === "USDT" && s.status === "TRADING")
          .map((s: any) => ({
            symbol:     s.symbol,
            baseAsset:  s.baseAsset,
            quoteAsset: s.quoteAsset,
          }));
        setAllSymbols(usdt);
      })
      .catch(() => {/* silently ignore */});
  }, []);

  // ── Initialise chart on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#050607" },
        textColor:  "rgba(255,255,255,0.55)",
        fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        vertLine:  { color: "rgba(247,201,72,0.45)", labelBackgroundColor: "#F7C948" },
        horzLine:  { color: "rgba(247,201,72,0.45)", labelBackgroundColor: "#F7C948" },
      },
      rightPriceScale: {
        borderColor:        "rgba(255,255,255,0.08)",
        textColor:          "rgba(255,255,255,0.55)",
      },
      timeScale: {
        borderColor:        "rgba(255,255,255,0.08)",
        timeVisible:        true,
        secondsVisible:     false,
      },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addCandlestickSeries({
      upColor:       CANDLE_UP_COLOR,
      downColor:     CANDLE_DOWN_COLOR,
      borderVisible: false,
      wickUpColor:   CANDLE_UP_WICK,
      wickDownColor: CANDLE_DOWN_WICK,
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    const currentContainer = containerRef.current;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (currentContainer && chartRef.current) {
        try {
          chartRef.current.applyOptions({
            width:  currentContainer.clientWidth,
            height: currentContainer.clientHeight,
          });
        } catch (e) {
          // Silently ignore if chart is disposed during resize callback
        }
      }
    });
    ro.observe(currentContainer);

    return () => {
      ro.disconnect();
      chartRef.current = null;
      seriesRef.current = null;
      chart.remove();
    };
  }, []);

  // ── Load historical data + subscribe WebSocket ─────────────────────────────
  const load = useCallback(async (sym: string, tf: string) => {
    if (!seriesRef.current) return;
    setLoading(true);
    setError("");

    // Close existing WS
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const candles = await fetchKlines(sym, tf);
      seriesRef.current.setData(candles);
      chartRef.current?.timeScale().fitContent();

      // Set current price from last candle
      if (candles.length > 0) {
        const last = candles[candles.length - 1];
        setPrice(last.close.toLocaleString(undefined, { maximumFractionDigits: 8 }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chart data");
    } finally {
      setLoading(false);
    }

    // Open WebSocket for live kline updates
    const streamName = `${sym.toLowerCase()}@kline_${tf}`;
    const ws = new WebSocket(`${BINANCE_WS}/${streamName}`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const k = msg.k;
        if (!k) return;

        const candle: CandlestickData = {
          time:  Math.floor(k.t / 1000) as Time,
          open:  parseFloat(k.o),
          high:  parseFloat(k.h),
          low:   parseFloat(k.l),
          close: parseFloat(k.c),
        };

        seriesRef.current?.update(candle);

        // Update live price display
        const newPrice = parseFloat(k.c);
        setPrice((prev) => {
          const prevNum = parseFloat(prev.replace(/,/g, ""));
          setPriceDir(newPrice >= prevNum ? "up" : "down");
          return newPrice.toLocaleString(undefined, { maximumFractionDigits: 8 });
        });
      } catch {/* ignore parse errors */}
    };

    ws.onerror = () => setError("WebSocket error — live updates paused");

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (chartRef.current) load(symbol, interval);
    return () => { wsRef.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  // ── Click-outside to close search ─────────────────────────────────────────
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Fullscreen toggle ──────────────────────────────────────────────────────
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  // ── Filtered symbol list ───────────────────────────────────────────────────
  const filteredSymbols = searchQuery.trim()
    ? allSymbols.filter(
        (s) =>
          s.symbol.includes(searchQuery.toUpperCase()) ||
          s.baseAsset.includes(searchQuery.toUpperCase())
      ).slice(0, 60)
    : allSymbols.slice(0, 60);

  function selectSymbol(sym: string) {
    setSymbol(sym);
    setSearchOpen(false);
    setSearchQuery("");
  }

  return (
    <div className="flex flex-col h-screen bg-[#050607] text-white overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-white/8 bg-black/80 backdrop-blur shrink-0 flex-wrap sm:flex-nowrap">

        {/* Back button */}
        <Link
          href="/terminal"
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 text-white/60 hover:border-terminal-yellow hover:text-terminal-yellow transition-all"
        >
          <ArrowLeft size={16} />
        </Link>

        {/* ZNT brand */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-terminal-yellow font-black text-black text-sm">
          Z
        </div>

        {/* Symbol search */}
        <div ref={searchRef} className="relative shrink-0">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="flex items-center gap-2 h-8 px-3 border border-white/10 bg-graphite-950 hover:border-terminal-yellow/50 transition-colors text-sm font-bold"
          >
            <span className="text-terminal-yellow">{symbol}</span>
            <ChevronDown size={13} className="text-white/40" />
          </button>

          {searchOpen && (
            <div className="absolute top-full left-0 mt-1 w-72 border border-white/12 bg-[#0a0b0d] shadow-2xl z-50 flex flex-col">
              {/* Search input */}
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <Search size={14} className="text-white/40 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search symbol… (BTC, ETH, SOL)"
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Escape") setSearchOpen(false);
                    if (e.key === "Enter" && filteredSymbols.length > 0) {
                      selectSymbol(filteredSymbols[0].symbol);
                    }
                  }}
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/25"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-white/40 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="overflow-y-auto max-h-72 custom-scrollbar">
                {filteredSymbols.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-white/40">No matching symbols</div>
                ) : (
                  filteredSymbols.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => selectSymbol(s.symbol)}
                      className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-white/5 transition-colors text-left ${
                        s.symbol === symbol ? "bg-terminal-yellow/10 text-terminal-yellow" : "text-white/80"
                      }`}
                    >
                      <span className="font-semibold">{s.baseAsset}</span>
                      <span className="text-xs text-white/35 font-mono">{s.symbol}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 overflow-x-auto shrink-0">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.interval}
              onClick={() => setIntervalTF(tf.interval)}
              className={`h-8 px-2.5 text-xs font-semibold transition-colors ${
                interval === tf.interval
                  ? "bg-terminal-yellow text-black"
                  : "border border-white/10 text-white/60 hover:border-terminal-yellow/40 hover:text-white"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Live price */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {loading ? (
            <span className="text-xs text-white/40 animate-pulse">Loading…</span>
          ) : price ? (
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-terminal-yellow animate-pulse" />
              <span
                className={`text-sm font-bold font-mono transition-colors duration-300 ${
                  priceDir === "up"
                    ? "text-terminal-yellow"
                    : priceDir === "down"
                    ? "text-white/70"
                    : "text-white"
                }`}
              >
                {price}
              </span>
            </div>
          ) : null}
        </div>

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 text-white/50 hover:border-terminal-yellow hover:text-terminal-yellow transition-all"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </header>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="shrink-0 px-4 py-2 text-xs text-terminal-red border-b border-terminal-red/20 bg-terminal-red/5 flex items-center gap-2">
          <Activity size={13} /> {error}
        </div>
      )}

      {/* ── Chart container ───────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#050607]/80">
            <div className="flex flex-col items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-terminal-yellow animate-ping" />
              <p className="text-xs text-white/50 uppercase tracking-widest font-mono">
                Loading {symbol} · {interval}
              </p>
            </div>
          </div>
        )}

        {/* Symbol watermark */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
          <p className="text-3xl font-black text-white/5 tracking-wider leading-none">{symbol}</p>
          <p className="text-lg font-bold text-white/4 tracking-wider">{interval}</p>
        </div>

        {/* Actual chart div */}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
