"use client";

import { useState } from "react";
import Link from "next/link";
import { sendTestEmail } from "@/lib/sendTestEmail";

export default function LiveTestPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("sending");
    const result = await sendTestEmail(email);
    setStatus(result.ok ? "sent" : "error");
    if (!result.ok) setError(result.error ?? "Something went wrong.");
  }

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">Live inbox test</h1>
        <p className="mt-3 text-[var(--muted)]">
          Get a real email with a protected link and a control link. Click both in your inbox to see
          the difference — the protected link works; the control link is often already used by scanners.
        </p>

        {status === "sent" ? (
          <div className="card card-gradient-top mt-10 border-[var(--accent)]/20 p-6">
            <p className="font-medium text-[var(--accent)]">Sent — check your inbox.</p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Try a corporate inbox if you can (Outlook, Defender). Click the protected link first,
              then the control link.
            </p>
            <p className="mt-6">
              <button
                type="button"
                onClick={() => { setStatus("idle"); setEmail(""); }}
                className="link-accent text-sm"
              >
                Send another
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text)]">
                Your email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={status === "sending"}
                className="input-base mt-2"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--accent)]" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="btn-primary w-full disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send test email"}
            </button>
          </form>
        )}

        <p className="mt-10 text-sm text-[var(--muted)]">
          <Link href="/" className="link-accent">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
