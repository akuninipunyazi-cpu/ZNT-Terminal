"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

const candles = [
  { time: "2026-05-18", open: 101, high: 108, low: 96, close: 105 },
  { time: "2026-05-19", open: 105, high: 112, low: 103, close: 110 },
  { time: "2026-05-20", open: 110, high: 114, low: 106, close: 108 },
  { time: "2026-05-21", open: 108, high: 121, low: 107, close: 119 },
  { time: "2026-05-22", open: 119, high: 127, low: 115, close: 124 },
  { time: "2026-05-23", open: 124, high: 129, low: 120, close: 126 }
];

export function MarketChart() {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 310,
      layout: {
        background: { type: ColorType.Solid, color: "#050607" },
        textColor: "rgba(255,255,255,0.64)"
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" }
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.12)"
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.12)"
      }
    });

    const series = chart.addCandlestickSeries({
      upColor: "#30d158",
      downColor: "#ff453a",
      borderVisible: false,
      wickUpColor: "#30d158",
      wickDownColor: "#ff453a"
    });

    series.setData(candles);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  return (
    <section className="border border-white/10 bg-black/70 shadow-[inset_0_1px_0_rgba(247,201,72,0.08)]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="text-sm font-semibold uppercase text-white/80">
          Focus Chart / Volatility Break
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-terminal-green">Vol +42%</span>
          <span className="text-terminal-yellow">BTCUSDT sample</span>
        </div>
      </div>
      <div ref={chartRef} className="h-[310px] w-full" />
    </section>
  );
}
