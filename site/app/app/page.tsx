"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getRailBaseUrl } from "@/lib/railBase";

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
    typeof window !== "undefined" ? `${window.location.origin}/start` : "/start"
  )}`;

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              Create your site and get a protected link format for Supabase.
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
              href={logoutUrl}
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            >
              Sign out
            </a>
          </div>
        </div>

        <div className="mt-12 card card-gradient-top border-[var(--accent)]/20 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Create site
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Connect your domain and we&apos;ll give you a protected link format to paste into Supabase email templates.
          </p>
          <a
            href="/docs/supabase"
            className="btn-hero mt-6 inline-flex w-full justify-center sm:w-auto"
          >
            Connect domain
          </a>
        </div>

        <ol className="mt-10 space-y-6">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-sm font-semibold text-[var(--accent)]">
              1
            </span>
            <div>
              <p className="font-medium text-[var(--text)]">Connect domain (CNAME)</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Point your link subdomain (e.g. links.yourdomain.com) to the rail.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-sm font-semibold text-[var(--accent)]">
              2
            </span>
            <div>
              <p className="font-medium text-[var(--text)]">Set secret / allowlist</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Configure allowed destination hosts in the worker.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-sm font-semibold text-[var(--accent)]">
              3
            </span>
            <div>
              <p className="font-medium text-[var(--text)]">Update email template link</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Replace your magic-link URL with the protected link from the rail.
              </p>
            </div>
          </li>
        </ol>
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
