"use client";

import { useEffect, useMemo, useState } from "react";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type RankingSnapshot = {
  timeframe: string;
  gainers: any[];
  losers: any[];
  source: "cache" | "empty" | string;
};

export type RealtimeState = {
  connected: boolean;
  lastEvent: string;
  latencyMs: number | null;
  data: any | null;
  latestNews: any | null;
};

export function useTerminalSocket(timeframe: string): RealtimeState {
  const [state, setState] = useState<RealtimeState>({
    connected: false,
    lastEvent: "offline",
    latencyMs: null,
    data: null,
    latestNews: null
  });


  const token = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem("znt_token");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCachedRankings() {
      setState((current) => ({
        ...current,
        data: null,
        lastEvent: "loading_rankings"
      }));

      try {
        const response = await fetch(`${API_BASE_URL}/terminal/rankings/${timeframe}`);
        if (!response.ok) {
          throw new Error("ranking bootstrap failed");
        }

        const snapshot = (await response.json()) as RankingSnapshot;
        if (!cancelled) {
          setState((current) => ({
            ...current,
            data: {
              timeframe: snapshot.timeframe,
              gainers: snapshot.gainers,
              losers: snapshot.losers
            },
            lastEvent: snapshot.source === "cache" ? "ranking_cache" : "ranking_empty"
          }));
        }
      } catch {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            data: null,
            lastEvent: "ranking_cache_error"
          }));
        }
      }
    }

    loadCachedRankings();

    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  useEffect(() => {
    let closed = false;
    const startedAt = Date.now();
    const socket = new WebSocket(
      `${WS_BASE_URL}/ws/terminal?timeframe=${timeframe}&token=${token ?? "dev"}`
    );

    socket.onopen = () => {
      if (!closed) {
        setState((current) => ({
          ...current,
          connected: true,
          lastEvent: "connected",
          latencyMs: Date.now() - startedAt
        }));
      }
    };

    socket.onmessage = (event) => {
      if (closed) {
        return;
      }

      const message = JSON.parse(event.data) as { type?: string };

      if (message.type === "session_revoked") {
        window.localStorage.removeItem("znt_token");
        window.location.assign("/login");
        return;
      }

      setState((current) => {
        if (message.type === "terminal_update") {
          return {
            ...current,
            lastEvent: "terminal_update",
            data: (message as any).data
          };
        } else if (message.type === "news_update") {
          return {
            ...current,
            lastEvent: "news_update",
            latestNews: (message as any).data
          };
        }
        return {
          ...current,
          lastEvent: message.type ?? "message"
        };
      });
    };

    socket.onclose = () => {
      if (!closed) {
        setState((current) => ({
          ...current,
          connected: false,
          lastEvent: "disconnected"
        }));
      }
    };

    return () => {
      closed = true;
      socket.close();
    };
  }, [timeframe, token]);

  return state;
}
