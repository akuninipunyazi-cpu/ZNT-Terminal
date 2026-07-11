"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";

type LoginResponse = {
  access_token: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password })
      });

      window.localStorage.setItem("znt_token", result.access_token);
      router.push("/terminal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="terminal-grid min-h-screen bg-graphite-950 px-4 py-6 text-white sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-5 lg:grid-cols-[1fr_420px]">
          <div className="relative flex min-h-[520px] flex-col justify-between overflow-hidden border border-white/10 bg-black/55 p-6 shadow-terminal backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-terminal-yellow to-transparent" />
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-terminal-yellow/40 bg-terminal-yellow text-black">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-sm uppercase text-terminal-yellow">
                    Z Nexus Trade
                  </p>
                  <h1 className="text-3xl font-semibold">ZNT Terminal</h1>
                </div>
              </div>

              <div className="max-w-2xl">
                <p className="mb-4 text-sm uppercase text-white/50">
                  Quant market screening
                </p>
                <h2 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                  Realtime anomaly desk for crypto market structure.
                </h2>
              </div>

              <div className="mt-8 grid gap-2 text-sm sm:grid-cols-2">
                {[
                  ["BTCUSDT", "+1.82%", "Vol spike"],
                  ["SOLUSDT", "+3.11%", "Entropy clean"],
                  ["WLDUSDT", "-2.46%", "Failed break"],
                  ["INJUSDT", "+4.92%", "Flow active"]
                ].map(([symbol, change, label]) => (
                  <div
                    key={symbol}
                    className="border border-white/10 bg-graphite-950/90 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{symbol}</span>
                      <span
                        className={
                          change.startsWith("-")
                            ? "text-terminal-red"
                            : "text-terminal-green"
                        }
                      >
                        {change}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/42">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/10 pt-5 text-sm text-white/68 sm:grid-cols-3">
              <span>Single active session</span>
              <span>Redis-first dev flow</span>
              <span>Screening, not advice</span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="border border-terminal-yellow/20 bg-graphite-900 p-5 shadow-terminal"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border border-white/12 bg-black">
                <LockKeyhole size={18} className="text-terminal-yellow" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Login</h2>
                <p className="text-sm text-white/54">Use email or username.</p>
              </div>
            </div>

            <label className="mb-4 block text-sm">
              <span className="mb-2 block text-white/70">Email or username</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="h-11 w-full border border-white/12 bg-black px-3 text-white outline-none transition focus:border-terminal-yellow"
                required
              />
            </label>

            <label className="mb-4 block text-sm">
              <span className="mb-2 block text-white/70">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full border border-white/12 bg-black px-3 text-white outline-none transition focus:border-terminal-yellow"
                required
              />
            </label>

            {error ? (
              <p className="mb-4 border border-terminal-red/30 bg-terminal-red/10 px-3 py-2 text-sm text-terminal-red">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mb-4 flex h-11 w-full items-center justify-center gap-2 bg-terminal-yellow px-4 font-semibold text-black transition hover:bg-terminal-amber disabled:cursor-wait disabled:opacity-70"
            >
              <LogIn size={18} />
              {loading ? "Checking session" : "Enter Terminal"}
            </button>

            <p className="text-center text-sm text-white/58">
              No active account yet?{" "}
              <Link href="/checkout" className="text-terminal-yellow">
                Start subscription
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
