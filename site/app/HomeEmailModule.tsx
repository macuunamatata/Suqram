"use client";

import { useState } from "react";
import { sendTestEmail } from "@/lib/sendTestEmail";

const BULLETS = [
  "See the difference between protected vs normal",
  "Works even when scanners click first",
  "Supabase-first, bring your own auth",
];

export default function HomeEmailModule() {
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
    <div className="mx-auto max-w-lg">
      {/* Primary card: form or success */}
      <div className="card card-padded card-gradient-top">
        {status === "sent" ? (
          <>
            <p className="font-semibold text-[var(--text)]">Check your inbox.</p>
            <ol className="mt-5 space-y-3 text-sm text-[var(--muted)]">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-medium text-[var(--accent)]">1.</span>
                Open the email
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-medium text-[var(--accent)]">2.</span>
                Click &quot;Protected link&quot;
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-medium text-[var(--accent)]">3.</span>
                Click &quot;Normal link&quot; (control)
              </li>
            </ol>
            <p className="mt-5 text-sm text-[var(--muted)]">
              Try an Outlook inbox if you can.
            </p>
            <button
              type="button"
              onClick={() => { setStatus("idle"); setEmail(""); }}
              className="link-accent mt-6 text-sm font-medium"
            >
              Send another
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="home-email" className="sr-only">
                Your email
              </label>
              <input
                id="home-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={status === "sending"}
                className="input-base"
                autoComplete="email"
              />
            </div>
            {error && (
              <p className="text-sm text-error-muted" role="alert">
                {error}
              </p>
            )}
<button
                type="submit"
                disabled={status === "sending"}
                className="btn-hero w-full disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send me the test email"}
              </button>
            <p className="text-center text-xs text-[var(--muted)]">
              No credit card. Takes ~60 seconds.
            </p>
          </form>
        )}
      </div>

      {/* Bullets under the card */}
      <ul className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6">
        {BULLETS.map((text) => (
          <li
            key={text}
            className="flex items-center gap-2 text-sm text-[var(--muted)] sm:justify-center"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
              aria-hidden
            />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
