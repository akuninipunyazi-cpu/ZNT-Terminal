"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function SetupAccountPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    setup_token: ""
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email") || "";
      const tokenParam = params.get("setup_token") || "";
      setForm((current) => ({
        ...current,
        email: emailParam,
        setup_token: tokenParam
      }));
    }
  }, []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await apiRequest("/auth/setup-account", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage("Account created. You can login now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account setup failed");
    }
  }

  return (
    <main className="min-h-screen bg-graphite-950 px-4 py-6 text-white">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl place-items-center">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl border border-white/10 bg-graphite-900 p-5 shadow-terminal"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-terminal-yellow text-black">
              <UserPlus size={21} />
            </div>
            <div>
              <p className="text-sm uppercase text-terminal-yellow">
                Payment verified
              </p>
              <h1 className="text-2xl font-semibold">Setup account</h1>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["name", "Name"],
              ["email", "Email"],
              ["username", "Username"],
              ["password", "Password"],
              ["setup_token", "Setup token"]
            ].map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="mb-2 block text-white/70">{label}</span>
                <input
                  type={key === "password" ? "password" : "text"}
                  value={form[key as keyof typeof form]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value
                    }))
                  }
                  className="h-11 w-full border border-white/12 bg-black px-3 text-white outline-none transition focus:border-terminal-yellow"
                  required
                />
              </label>
            ))}
          </div>

          {error ? (
            <p className="mt-4 border border-terminal-red/30 bg-terminal-red/10 px-3 py-2 text-sm text-terminal-red">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 border border-terminal-green/30 bg-terminal-green/10 px-3 py-2 text-sm text-terminal-green">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-5 h-11 w-full bg-terminal-yellow px-4 font-semibold text-black transition hover:bg-terminal-amber"
          >
            Create account
          </button>

          <Link href="/login" className="mt-4 block text-center text-sm text-white/56">
            Back to login
          </Link>
        </form>
      </section>
    </main>
  );
}
