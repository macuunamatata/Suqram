"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getRailBaseUrl, getSiteOrigin } from "@/lib/railBase";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"checking" | "authenticated" | "redirecting">("checking");

  useEffect(() => {
    let mounted = true;
    const base = getRailBaseUrl();
    const nextPath = `/app${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    fetch(`${base}/app/counters`, { credentials: "include" })
      .then((res) => {
        if (!mounted) return;
        if (res.ok) {
          setStatus("authenticated");
        } else {
          setStatus("redirecting");
          window.location.href = `/start?next=${encodeURIComponent(nextPath)}`;
        }
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("redirecting");
        window.location.href = `/start?next=${encodeURIComponent(nextPath)}`;
      });

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  if (status === "checking" || status === "redirecting") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Checking session…</p>
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
              Your site is ready
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              Connect your domain and get a protected link format for Supabase.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/docs/supabase"
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            >
              Docs
            </a>
            <a
              href="/app/api-keys"
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            >
              API keys
            </a>
            <a
              href={logoutUrl}
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            >
              Sign out
            </a>
          </div>
        </div>

        <div className="mt-12 card card-gradient-top border-[var(--accent)]/20 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Connect domain
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Point your link subdomain to the rail and paste the protected link format into Supabase email templates.
          </p>
          <a
            href="/docs/supabase"
            className="btn-hero mt-6 inline-flex w-full justify-center sm:w-auto"
          >
            Connect domain
          </a>
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[var(--text)]">Tools</h2>
          <div className="mt-4 space-y-4">
            <a
              href="/docs/supabase#generate"
              className="block card p-4 border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 transition-colors"
            >
              <span className="font-medium text-[var(--text)]">Generate protected link</span>
              <p className="mt-1 text-sm text-[var(--muted)]">Paste your destination URL and get the protected link for your email.</p>
            </a>
            <a
              href="/#demo"
              className="block card p-4 border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 transition-colors"
            >
              <span className="font-medium text-[var(--text)]">Inbox test</span>
              <p className="mt-1 text-sm text-[var(--muted)]">Try the demo to see how protected links behave.</p>
            </a>
          </div>
        </section>

        <p className="mt-8">
          <a href="/docs/supabase" className="link-accent text-sm">
            Supabase setup guide →
          </a>
        </p>
      </div>
    </div>
  );
}

export default function AppDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-[var(--muted)]">Checking session…</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
