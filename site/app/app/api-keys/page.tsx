"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getRailBaseUrl, getSiteOrigin } from "@/lib/railBase";

const SESSION_CHECK_URL = "https://go.suqram.com/app/counters";
const SESSION_CHECK_TIMEOUT_MS = 1500;

export default function ApiKeysPage() {
  const [status, setStatus] = useState<"checking" | "authenticated" | "not_logged_in">("checking");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const timeoutId = setTimeout(() => {
      abortRef.current?.abort();
    }, SESSION_CHECK_TIMEOUT_MS);

    fetch(SESSION_CHECK_URL, { credentials: "include", signal })
      .then((res) => {
        if (!mounted) return;
        clearTimeout(timeoutId);
        if (res.ok) {
          setStatus("authenticated");
        } else {
          setStatus("not_logged_in");
        }
      })
      .catch((e) => {
        if (!mounted) return;
        clearTimeout(timeoutId);
        if (e instanceof Error && e.name === "AbortError") return;
        setStatus("not_logged_in");
      });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Checking session…</p>
      </div>
    );
  }

  if (status === "not_logged_in") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md px-4 text-center">
          <p className="text-sm text-[var(--muted)]">You’re not signed in.</p>
          <p className="mt-4">
            <Link href="/start?next=%2Fapp%2Fapi-keys" className="link-accent text-sm font-medium">
              Create site or sign in →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const logoutUrl = `${getRailBaseUrl()}/app/logout?redirect=${encodeURIComponent(
    `${getSiteOrigin()}/start`
  )}`;

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
              API keys
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              Advanced: programmatic access to your site.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/app" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
              Dashboard
            </Link>
            <a
              href={logoutUrl}
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            >
              Sign out
            </a>
          </div>
        </div>

        <div className="mt-12 card border-[var(--border)] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            API key
          </h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Your API key is used for programmatic access (e.g. Admin API, receipts). It was provided once when your site was created. For security, we don&apos;t show it again here.
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            To get a new key, use the Admin API <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)] font-mono text-xs">POST /admin/sites/:siteId/rotate-sat</code> with your current admin credentials. The response returns the new key once; store it securely.
          </p>
          <p className="mt-6">
            <Link href="/docs" className="link-accent text-sm">
              Docs →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
