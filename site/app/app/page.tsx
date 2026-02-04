"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getRailBaseUrl, getSiteOrigin } from "@/lib/railBase";
import { useDashboardUser } from "./DashboardContext";
import { signOut } from "@/app/actions/auth";

export const runtime = 'edge';

const BOOTSTRAP_URL = "https://go.suqram.com/app/bootstrap";
const GENERATE_LINK_URL = "https://go.suqram.com/app/generate-link";
const BOOTSTRAP_TIMEOUT_MS = 1500;

type Bootstrap = { logged_in: false } | { logged_in: true; site: { site_id: string; hostname: string } };

function DashboardHeader() {
  const user = useDashboardUser();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Manage your link rail and generate protected links.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <Link href="/docs" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
          Docs
        </Link>
        <Link href="/docs/setup" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
          Setup guides
        </Link>
        <Link href="/app/api-keys" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
          Advanced: use an API key
        </Link>
        {user?.email && (
          <span className="text-sm text-[var(--muted)]" title={user.email}>
            {user.email}
          </span>
        )}
        <form action={signOut} className="inline">
          <button type="submit" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateFirstSiteButton() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextFull = `${getSiteOrigin()}/app`;
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(BOOTSTRAP_URL.replace("/bootstrap", "/create-site"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ next: nextFull }),
      });
      const data = (await res.json()) as { ok?: boolean; redirect_to?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error || `Error ${res.status}`);
      if (data.redirect_to) window.location.href = data.redirect_to;
      else window.location.href = nextFull;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setSubmitting(false);
    }
  };
  return (
    <form onSubmit={handleCreate} className="mt-6">
      <button type="submit" className="btn-hero" disabled={submitting}>
        {submitting ? "Creating…" : "Create your first site"}
      </button>
      {error && <p className="mt-3 text-sm text-[var(--error-muted)]">{error}</p>}
    </form>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const user = useDashboardUser();
  const session = user ? { user: { email: user.email, name: user.user_metadata?.name ?? null } } : null;
  const [status, setStatus] = useState<"checking" | "authenticated" | "not_logged_in">("checking");
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [destUrl, setDestUrl] = useState("");
  const [protectedUrl, setProtectedUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const timeoutId = setTimeout(() => {
      abortRef.current?.abort();
    }, BOOTSTRAP_TIMEOUT_MS);

    fetch(BOOTSTRAP_URL, { credentials: "include", signal })
      .then((res) => res.json() as Promise<Bootstrap>)
      .then((data) => {
        if (!mounted) return;
        clearTimeout(timeoutId);
        setBootstrap(data);
        setStatus(data.logged_in ? "authenticated" : "not_logged_in");
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
  }, [searchParams]);

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerateError(null);
    setProtectedUrl(null);
    if (!destUrl.trim()) return;
    setGenerateLoading(true);
    try {
      const res = await fetch(GENERATE_LINK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: destUrl.trim() }),
      });
      const data = (await res.json()) as { protected_url?: string; error?: string };
      if (!res.ok) {
        setGenerateError(data?.error ?? `Error ${res.status}`);
        return;
      }
      if (data?.protected_url) setProtectedUrl(data.protected_url);
      else setGenerateError("No link returned");
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setGenerateLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Checking session…</p>
      </div>
    );
  }

  if (status === "not_logged_in") {
    return (
      <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <DashboardHeader />
          <div className="mt-12 flex min-h-[40vh] flex-col items-center justify-center">
            <p className="text-center text-[var(--muted)]">
              Create your first link rail to get started.
            </p>
            <CreateFirstSiteButton />
          </div>
        </div>
      </div>
    );
  }

  const site = bootstrap?.logged_in ? bootstrap.site : null;

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <DashboardHeader />

        {/* Section 1: Site */}
        <section className="mt-12 card border-[var(--border)] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">Site</h2>
          {site ? (
            <>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Site ID: <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 font-mono text-xs">{site.site_id}</code>
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Domain: <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 font-mono text-xs">{site.hostname}</code>
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">Status: Active</p>
              <Link href="/docs/setup" className="link-accent mt-4 inline-block text-sm">
                Connect domain →
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No site loaded.</p>
          )}
        </section>

        {/* Section 2: Generate protected link */}
        <section className="mt-8 card card-gradient-top border-[var(--accent)]/20 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">Generate protected link</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Paste a destination URL and get a protected link to use in your emails.
          </p>
          <form onSubmit={handleGenerateLink} className="mt-4 space-y-3">
            <input
              type="url"
              value={destUrl}
              onChange={(e) => setDestUrl(e.target.value)}
              placeholder="https://yourapp.com/auth/verify?token=..."
              className="input-base w-full font-mono text-sm"
              required
            />
            <button type="submit" className="btn-hero" disabled={generateLoading}>
              {generateLoading ? "Generating…" : "Generate link"}
            </button>
          </form>
          {generateError && (
            <p className="mt-3 text-sm text-[var(--error-muted)]">{generateError}</p>
          )}
          {protectedUrl && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
              <p className="text-xs font-medium text-[var(--muted)]">Protected URL</p>
              <p className="mt-1 break-all font-mono text-sm text-[var(--text)]" title={protectedUrl}>
                {protectedUrl}
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(protectedUrl);
                }}
                className="mt-2 text-sm text-[var(--accent)] hover:underline"
              >
                Copy
              </button>
            </div>
          )}
        </section>

        {/* Section 3: Inbox test */}
        <section className="mt-8 card border-[var(--border)] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">Inbox test</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            See how protected links behave when security tools pre-open links. No login required.
          </p>
          <Link href="/#demo" className="btn-hero mt-4 inline-flex w-full justify-center sm:w-auto">
            Run demo
          </Link>
        </section>

        <p className="mt-8">
          <Link href="/docs/setup" className="link-accent text-sm">
            Setup guides →
          </Link>
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
