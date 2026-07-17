"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const SYMBOLS = [
  { label: "BTC/USDT", value: "BINANCE:BTCUSDT" },
  { label: "ETH/USDT", value: "BINANCE:ETHUSDT" },
  { label: "SOL/USDT", value: "BINANCE:SOLUSDT" },
  { label: "BNB/USDT", value: "BINANCE:BNBUSDT" },
];

const INTERVALS = [
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1h", value: "60" },
  { label: "4h", value: "240" },
  { label: "1D", value: "D" },
  { label: "1W", value: "W" },
];

const CHART_TYPES = [
  { label: "Candles", value: "1" },
  { label: "Bars", value: "0" },
  { label: "Line", value: "2" },
  { label: "Area", value: "3" },
];

export function MarketChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [symbol, setSymbol] = useState(SYMBOLS[0].value);
  const [interval, setInterval] = useState("60");
  const [chartType, setChartType] = useState("1");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    // Remove any existing widget
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: "Asia/Jakarta",
      theme: "dark",
      style: chartType,
      locale: "en",
      backgroundColor: "rgba(5, 6, 7, 1)",
      gridColor: "rgba(255, 255, 255, 0.04)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      withdateranges: true,
      hide_side_toolbar: false,
      details: false,
      hotlist: false,
      studies: [
        "Volume@tv-basicstudies",
        "MACD@tv-basicstudies",
      ],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650",
      container_id: "tv_chart_container",
    });

    const container = document.createElement("div");
    container.className = "tradingview-widget-container__widget";
    container.style.height = "100%";
    container.style.width = "100%";

    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.appendChild(container);
      currentContainer.appendChild(script);
    }

    widgetRef.current = script;

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = "";
      }
    };
  }, [symbol, interval, chartType]);

  const selectedSymbolLabel =
    SYMBOLS.find((s) => s.value === symbol)?.label ?? "BTC/USDT";

  return (
    <section
      className={`border border-white/10 bg-black/70 shadow-[inset_0_1px_0_rgba(247,201,72,0.08)] flex flex-col transition-all duration-300 ${
        fullscreen
          ? "fixed inset-0 z-50 border-none"
          : ""
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">
            📈 Market Chart
          </h2>
          {/* Symbol selector */}
          <div className="flex items-center gap-1">
            {SYMBOLS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSymbol(s.value)}
                className={`h-7 px-2.5 text-xs font-semibold transition-colors ${
                  symbol === s.value
                    ? "bg-terminal-yellow text-black"
                    : "border border-white/10 text-white/50 hover:border-terminal-yellow/50 hover:text-white/80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart type */}
          <div className="hidden sm:flex items-center gap-1">
            {CHART_TYPES.map((c) => (
              <button
                key={c.value}
                onClick={() => setChartType(c.value)}
                className={`h-7 px-2 text-[11px] transition-colors ${
                  chartType === c.value
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Interval */}
          <div className="flex items-center gap-1">
            {INTERVALS.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setInterval(tf.value)}
                className={`h-7 min-w-[2rem] px-2 text-xs font-semibold transition-colors ${
                  interval === tf.value
                    ? "bg-terminal-yellow text-black"
                    : "border border-white/10 text-white/50 hover:border-terminal-yellow/50 hover:text-white/80"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="flex h-7 w-7 items-center justify-center border border-white/10 text-white/50 hover:border-terminal-yellow/50 hover:text-white/80 transition-colors text-sm"
          >
            {fullscreen ? "⊠" : "⊡"}
          </button>
        </div>
      </div>

      {/* TradingView Widget */}
      <div
        id="tv_chart_container"
        ref={containerRef}
        className="tradingview-widget-container flex-1"
        style={{ height: fullscreen ? "calc(100vh - 50px)" : "460px" }}
      />

      {/* Branding strip */}
      <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-1.5">
        <span className="text-[10px] text-white/20 font-mono">
          Powered by TradingView
        </span>
        <span className="text-[10px] text-white/20 font-mono uppercase">
          {selectedSymbolLabel} · WS Live
        </span>
      </div>
    </section>
  );
}
