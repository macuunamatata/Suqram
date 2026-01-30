"use client";

import { useState } from "react";
import Link from "next/link";
import { RAIL_BASE_DEFAULT } from "@/lib/constants";

export default function LiveTestPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("sending");
    try {
      const res = await fetch(`${RAIL_BASE_DEFAULT}/test/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setError(data?.error || data?.detail || "Request failed");
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold text-slate-900">Live inbox test</h1>
      <p className="mt-2 text-slate-600">
        Get a real email with a protected link and a control link. Click both in your inbox to see
        the difference — the protected link works; the control link is often already used by scanners.
      </p>

      {status === "sent" ? (
        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6">
          <p className="font-medium text-green-800">Sent — check your inbox.</p>
          <p className="mt-2 text-sm text-green-700">
            Try a corporate inbox if you can (Outlook, Defender). Click the protected link first,
            then the control link.
          </p>
          <p className="mt-4">
            <button
              type="button"
              onClick={() => { setStatus("idle"); setEmail(""); }}
              className="text-sm font-medium text-green-700 underline hover:no-underline"
            >
              Send another
            </button>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Your email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="you@example.com"
              disabled={status === "sending"}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send test email"}
          </button>
        </form>
      )}

      <p className="mt-8 text-sm text-slate-500">
        <Link href="/start" className="text-sky-600 hover:text-sky-700">
          ← Start free
        </Link>
      </p>
    </div>
  );
}
