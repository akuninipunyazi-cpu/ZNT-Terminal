"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/api";

type CheckoutResponse = {
  payment_url: string;
};

export default function CheckoutPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest<CheckoutResponse>("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ email, plan_code: "znt-premium-monthly" })
      });

      window.location.assign(response.payment_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment initialization failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-graphite-950 px-4 py-6 text-white">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl place-items-center">
        <form
          onSubmit={handleCheckout}
          className="w-full max-w-xl border border-white/10 bg-graphite-900 p-5 shadow-terminal"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-terminal-yellow text-black">
              <CreditCard size={21} />
            </div>
            <div>
              <p className="text-sm uppercase text-terminal-yellow">Subscription</p>
              <h1 className="text-2xl font-semibold">Activate ZNT Terminal</h1>
            </div>
          </div>

          <div className="mb-5 border border-white/10 bg-black p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="font-semibold">ZNT Premium Monthly</span>
              <span className="text-terminal-yellow">IDR 0 placeholder</span>
            </div>
            <p className="text-sm leading-6 text-white/62">
              Midtrans checkout is the payment gate. Account setup opens only
              after the backend receives a successful Midtrans webhook.
            </p>
          </div>

          <label className="mb-4 block text-sm">
            <span className="mb-2 block text-white/70">Email for receipt</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
            {loading ? "Opening payment" : "Continue to payment"}
            <ArrowRight size={18} />
          </button>

          <Link href="/login" className="block text-center text-sm text-white/56">
            Back to login
          </Link>
        </form>
      </section>
    </main>
  );
}
