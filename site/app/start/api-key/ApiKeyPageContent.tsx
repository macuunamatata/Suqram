"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRailBaseUrl } from "@/lib/railBase";

type Props = { defaultNext: string };

function getNextFromUrl(): string {
  if (typeof window === "undefined") return "/app";
  const next = new URLSearchParams(window.location.search).get("next");
  return (next && next.trim()) || "/app";
}

export default function ApiKeyPageContent({ defaultNext }: Props) {
  const [nextFull, setNextFull] = useState(defaultNext);

  useEffect(() => {
    const next = getNextFromUrl();
    setNextFull(
      `${window.location.origin}${next.startsWith("/") ? next : `/${next}`}`
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    const base = getRailBaseUrl();
    fetch(`${base}/app/counters`, { credentials: "include" })
      .then((res) => {
        if (!mounted) return;
        if (res.ok) {
          const next = getNextFromUrl();
          const origin = window.location.origin;
          const target = next.startsWith("/") ? `${origin}${next}` : next;
          window.location.href = target;
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const railBase = getRailBaseUrl();
  const loginAction = `${railBase}/app/login`;

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          Sign in with API key
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          For advanced use: sign in using your API key to access the dashboard.
        </p>

        <div className="mt-10 card card-gradient-top border-[var(--border)] p-6 sm:p-8">
          <form method="POST" action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={nextFull} />
            <label htmlFor="sat" className="block text-sm font-medium text-[var(--text)]">
              API key
            </label>
            <input
              id="sat"
              name="sat"
              type="text"
              required
              placeholder="Enter your API key"
              className="input-base w-full font-mono text-sm"
            />
            <button type="submit" className="btn-hero w-full">
              Continue
            </button>
          </form>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Your API key was provided when your site was created. Use the Admin API to rotate it if needed.
          </p>
        </div>

        <p className="mt-8">
          <Link href="/start" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
            ← Create your first site (no API key)
          </Link>
        </p>
      </div>
    </div>
  );
}
