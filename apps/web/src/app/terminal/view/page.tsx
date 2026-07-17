"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TerminalViewPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    // Clear any existing children
    currentContainer.innerHTML = "";

    // Create the script element to load the TradingView Advanced Chart Widget
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // Embedded configuration matching the real TradingView layout
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BINANCE:BTCUSDT",
      interval: "15", // Default to 15 minutes
      timezone: "Asia/Jakarta",
      theme: "dark",
      style: "1", // Candlesticks
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false, // Show all drawing tools
      calendar: true, // Show macroeconomic calendar events
      show_popup_button: false,
      withdateranges: true,
      details: true, // Show symbol description/details panel on the right
      hotlist: true, // Show watchlists/gainers lists on the right
      container_id: "tradingview_advanced_chart_container",
      support_host: "https://www.tradingview.com",
    });

    currentContainer.appendChild(script);

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#050607] text-white overflow-hidden">
      {/* Sleek top navigation bar */}
      <header className="flex h-11 items-center gap-3 px-4 border-b border-white/8 bg-black/80 backdrop-blur shrink-0">
        <Link
          href="/terminal"
          className="flex h-7 w-7 items-center justify-center border border-white/10 text-white/60 hover:border-terminal-yellow hover:text-terminal-yellow transition-all"
          title="Back to Screening"
        >
          <ArrowLeft size={14} />
        </Link>
        <div className="flex h-6 w-6 items-center justify-center bg-terminal-yellow font-black text-black text-xs">
          Z
        </div>
        <div>
          <h1 className="text-xs font-bold uppercase tracking-wider">TradingView Interface</h1>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[10px] text-white/36 font-mono uppercase">
          <span>USDT Base Pairs</span>
          <span>·</span>
          <span>Drawing Panel Active</span>
        </div>
      </header>

      {/* Full-screen chart wrapper */}
      <div className="flex-1 min-h-0 relative">
        <div
          id="tradingview_advanced_chart_container"
          ref={containerRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
