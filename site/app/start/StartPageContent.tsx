"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getRailBaseUrl, getSiteOrigin } from "@/lib/railBase";

const CREATE_SITE_URL = "https://go.suqram.com/app/create-site";

/** First non-empty string from candidates; null/undefined/whitespace count as missing. */
function pickMsg(candidates: (string | null | undefined)[]): string {
  for (const c of candidates) {
    if (c != null && typeof c === "string" && c.trim() !== "") return c.trim();
  }
  const last = candidates[candidates.length - 1];
  return last != null && typeof last === "string" ? last : "";
}

type Props = { defaultNext: string };

function getNextFromUrl(): string {
  if (typeof window === "undefined") return "/app";
  const next = new URLSearchParams(window.location.search).get("next");
  return (next && next.trim()) || "/app";
}

export default function StartPageContent({ defaultNext }: Props) {
  const [nextPath, setNextPath] = useState(defaultNext);
  const [nextFull, setNextFull] = useState(defaultNext);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const next = getNextFromUrl();
    const path = next.startsWith("/") ? next : `/${next}`;
    setNextPath(path);
    setNextFull(`${getSiteOrigin()}${path}`);
  }, []);

  useEffect(() => {
    let mounted = true;
    const base = getRailBaseUrl();
    fetch(`${base}/app/counters`, { credentials: "include" })
      .then((res) => {
        if (!mounted) return;
        if (res.ok) {
          const next = getNextFromUrl();
          const path = next.startsWith("/") ? next : `/${next}`;
          window.location.href = path;
        }
      })
      .catch(() => { /* not logged in */ });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateSite = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setCreateError(null);
      setCreateSubmitting(true);
      const formData = new FormData();
      formData.set("next", nextFull);
      try {
        const res = await fetch(CREATE_SITE_URL, {
          method: "POST",
          body: formData,
          credentials: "include",
          redirect: "manual",
        });
        if (res.type === "opaqueredirect" || res.status === 302) {
          window.location.href = nextPath;
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          let errMsg: string;
          try {
            const data = text ? (JSON.parse(text) as { error?: string }) : {};
            errMsg = pickMsg([data.error, text, res.statusText, "Failed to create site"]);
          } catch {
            errMsg = pickMsg([text, res.statusText, "Failed to create site"]);
          }
          setCreateError(`${res.status}: ${errMsg}`);
          setCreateSubmitting(false);
          return;
        }
        window.location.href = nextPath;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Request failed";
        setCreateError(message);
        setCreateSubmitting(false);
      }
    },
    [nextFull, nextPath]
  );

  const railBase = getRailBaseUrl();
  const loginAction = `${railBase}/app/login`;
  const showApiKeyForm = nextPath === "/app/api-keys";

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-md">
        {showApiKeyForm ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
              Sign in with API key
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              Enter your API key to open the API keys dashboard.
            </p>
            <div className="mt-10 card border-[var(--border)] p-6 sm:p-8">
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
            </div>
            <p className="mt-8">
              <Link href="/start" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
                ← Create your first site (no API key)
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
              Create your first site
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              Get a protected link format to paste into Supabase email templates. No API key required.
            </p>

            <div className="mt-10 card card-gradient-top border-[var(--accent)]/20 p-6 sm:p-8">
              <form onSubmit={handleCreateSite} className="space-y-4">
                {createError && (
                  <p className="text-sm text-[var(--error-muted)]">{createError}</p>
                )}
                <button
                  type="submit"
                  className="btn-hero w-full"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? "Creating…" : "Create your first site"}
                </button>
              </form>
            </div>

            <p className="mt-8">
              <Link href="/app/api-keys" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
                Advanced: sign in with API key
              </Link>
            </p>
            <p className="mt-4">
              <Link href="/docs/supabase" className="link-accent text-sm">
                Supabase setup guide →
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
