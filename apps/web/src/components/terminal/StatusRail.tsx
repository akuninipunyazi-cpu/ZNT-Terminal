import { Activity, Database, RadioTower, ShieldCheck } from "lucide-react";

type StatusRailProps = {
  connected: boolean;
  lastEvent: string;
  latencyMs: number | null;
};

const items = [
  { label: "Exchange WS", value: "armed", icon: RadioTower },
  { label: "Redis Streams", value: "ready", icon: Database },
  { label: "Engine", value: "screening", icon: Activity },
  { label: "Session", value: "single active", icon: ShieldCheck }
];

export function StatusRail({ connected, lastEvent, latencyMs }: StatusRailProps) {
  return (
    <div className="grid gap-2 border border-white/10 bg-black/70 p-3">
      <div className="border border-terminal-yellow/20 bg-graphite-950 px-3 py-3">
        <p className="text-xs uppercase text-white/42">Realtime</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={connected ? "text-terminal-green" : "text-terminal-red"}>
            {connected ? "connected" : "offline"}
          </span>
          <span className="text-xs text-white/42">
            {latencyMs === null ? "-" : `${latencyMs}ms`}
          </span>
        </div>
        <p className="mt-2 text-xs text-white/44">{lastEvent}</p>
      </div>

      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 border border-white/10 bg-graphite-950 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Icon size={16} className="text-terminal-yellow" />
              <span className="text-sm text-white/74">{item.label}</span>
            </div>
            <span className="text-xs uppercase text-white/38">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

