import { clsx } from "clsx";

export type SignalRow = {
  symbol: string;
  side: "long" | "short";
  price: string;
  anomalyScore: number;
  entropy: number;
  liquidity: "A" | "B" | "C";
  momentumLabel: string;
  continuation: number;
};

type SignalTableProps = {
  title: string;
  rows: SignalRow[];
};

export function SignalTable({ title, rows }: SignalTableProps) {
  return (
    <section className="min-w-0 border border-white/10 bg-black/70">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="text-sm font-semibold uppercase text-white/80">{title}</h2>
        <span className="text-xs text-white/42">{rows.length} candidates</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-black/48 text-xs uppercase text-white/44">
            <tr>
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Side</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Anomaly</th>
              <th className="px-3 py-2 font-medium">Entropy</th>
              <th className="px-3 py-2 font-medium">Liquidity</th>
              <th className="px-3 py-2 font-medium">Momentum</th>
              <th className="px-3 py-2 font-medium">Continuation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.symbol}-${row.side}`}
                className="border-t border-white/[0.07] hover:bg-white/[0.035]"
              >
                <td className="px-3 py-2 font-semibold text-white">{row.symbol}</td>
                <td
                  className={clsx(
                    "px-3 py-2 font-semibold uppercase",
                    row.side === "long" ? "text-terminal-green" : "text-terminal-red"
                  )}
                >
                  {row.side}
                </td>
                <td className="px-3 py-2 text-white/78">{row.price}</td>
                <td className="px-3 py-2 text-terminal-yellow">
                  {row.anomalyScore.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-white/70">{row.entropy.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <span className="border border-terminal-yellow/25 bg-terminal-yellow/10 px-2 py-1 text-xs text-terminal-yellow">
                    {row.liquidity}
                  </span>
                </td>
                <td className="px-3 py-2 text-white/70">{row.momentumLabel}</td>
                <td className="px-3 py-2 text-white/80">{row.continuation}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
