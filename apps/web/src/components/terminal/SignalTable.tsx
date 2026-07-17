


export type SignalRow = {
  symbol:        string;
  side:          "long" | "short";
  price:         string;
  anomalyScore:  number;
  entropy:       number;
  liquidity:     "A" | "B" | "C";
  momentumLabel: string;
  continuation:  number;
};

type SignalTableProps = {
  title: string;
  rows:  SignalRow[];
};

export function SignalTable({ title, rows }: SignalTableProps) {
  return (
    <section className="min-w-0 border border-white/10 bg-black/70">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase text-white/80">{title}</h2>
        <span className="text-[10px] text-white/42">{rows.length} candidates</span>
      </div>

      {rows.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-xs text-white/30">
          No signals on this timeframe
        </div>
      ) : (
        <>
          {/* Desktop: scrollable table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead className="bg-black/48 text-[10px] uppercase text-white/44">
                <tr>
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Anomaly</th>
                  <th className="px-3 py-2 font-medium">Entropy</th>
                  <th className="px-3 py-2 font-medium">Liq</th>
                  <th className="px-3 py-2 font-medium">Momentum</th>
                  <th className="px-3 py-2 font-medium">Cont.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.symbol}-${row.side}`}
                    className="border-t border-white/[0.07] hover:bg-white/[0.035]"
                  >
                    <td className="px-3 py-2 font-semibold text-white">{row.symbol}</td>
                    <td className={`px-3 py-2 font-semibold uppercase text-xs ${row.side === "long" ? "text-terminal-green" : "text-terminal-red"}`}>
                      {row.side}
                    </td>
                    <td className="px-3 py-2 text-white/78 font-mono">{row.price}</td>
                    <td className="px-3 py-2 text-terminal-yellow">{row.anomalyScore.toFixed(1)}</td>
                    <td className="px-3 py-2 text-white/70">{row.entropy.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className="border border-terminal-yellow/25 bg-terminal-yellow/10 px-1.5 py-0.5 text-[10px] text-terminal-yellow">
                        {row.liquidity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/70 text-[11px]">{row.momentumLabel}</td>
                    <td className="px-3 py-2 text-white/80">{row.continuation}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: compact card list */}
          <div className="sm:hidden divide-y divide-white/[0.06]">
            {rows.map((row) => (
              <div key={`${row.symbol}-${row.side}-m`} className="p-3 hover:bg-white/[0.03]">
                {/* Top row: symbol + side badge + price */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{row.symbol}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-sm ${
                      row.side === "long"
                        ? "bg-terminal-green/10 border border-terminal-green/30 text-terminal-green"
                        : "bg-terminal-red/10 border border-terminal-red/30 text-terminal-red"
                    }`}>
                      {row.side}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-white/70">{row.price}</span>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="border border-white/8 bg-graphite-950 rounded-sm px-2 py-1.5">
                    <p className="text-[9px] text-white/40 uppercase">Anomaly</p>
                    <p className="text-xs font-semibold text-terminal-yellow mt-0.5">
                      {row.anomalyScore.toFixed(1)}
                    </p>
                  </div>
                  <div className="border border-white/8 bg-graphite-950 rounded-sm px-2 py-1.5">
                    <p className="text-[9px] text-white/40 uppercase">Entropy</p>
                    <p className="text-xs font-semibold text-white/70 mt-0.5">
                      {row.entropy.toFixed(2)}
                    </p>
                  </div>
                  <div className="border border-white/8 bg-graphite-950 rounded-sm px-2 py-1.5">
                    <p className="text-[9px] text-white/40 uppercase">Cont.</p>
                    <p className="text-xs font-semibold text-terminal-cyan mt-0.5">
                      {row.continuation}%
                    </p>
                  </div>
                </div>

                {/* Momentum label */}
                <p className="mt-2 text-[10px] text-white/40 font-mono">
                  {row.momentumLabel} ·{" "}
                  <span className="border border-terminal-yellow/25 bg-terminal-yellow/10 px-1 py-0.5 text-[9px] text-terminal-yellow">
                    Liq {row.liquidity}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
