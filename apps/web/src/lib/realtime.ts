"use client";

import { useEffect, useMemo, useState } from "react";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";

export type RealtimeState = {
  connected: boolean;
  lastEvent: string;
  latencyMs: number | null;
  data: any | null;
};

export function useTerminalSocket(timeframe: string): RealtimeState {
  const [state, setState] = useState<RealtimeState>({
    connected: false,
    lastEvent: "offline",
    latencyMs: null,
    data: null
  });

  const token = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem("znt_token");
  }, []);

  useEffect(() => {
    let closed = false;
    const startedAt = Date.now();
    const socket = new WebSocket(
      `${WS_BASE_URL}/ws/terminal?timeframe=${timeframe}&token=${token ?? "dev"}`
    );

    socket.onopen = () => {
      if (!closed) {
        setState({
          connected: true,
          lastEvent: "connected",
          latencyMs: Date.now() - startedAt
        });
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

      setState((current) => ({
        ...current,
        lastEvent: message.type ?? "message",
        data: message.type === "terminal_update" ? (message as any).data : current.data
      }));
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
