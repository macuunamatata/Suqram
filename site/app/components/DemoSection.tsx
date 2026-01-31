"use client";

import { useEffect, useState } from "react";

const DEMO_CREATE_URL = "https://go.suqram.com/demo/create";
const DEMO_SCAN_URL = "https://go.suqram.com/demo/scan";

function formatApiError(prefix: string, status: number, data: { error?: string } | null): string {
  const part = data?.error ? `: ${data.error}` : "";
  return `${prefix} (${status})${part}`;
}

type DemoLinks = {
  tid: string;
  unprotected_url: string;
  protected_url: string;
  unprotected_display: string;
  protected_display: string;
};

export default function DemoSection() {
  const [links, setLinks] = useState<DemoLinks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const createRes = await fetch(DEMO_CREATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const createJson = await createRes.json().catch(() => ({})) as { ok?: boolean; tid?: string; error?: string; unprotected_url?: string; protected_url?: string; unprotected_display?: string; protected_display?: string };
        if (!createRes.ok) {
          setError(formatApiError("Create failed", createRes.status, createJson));
          setLoading(false);
          return;
        }
        if (!createJson?.ok || !createJson.tid) {
          setError("Invalid create response. Please try again.");
          setLoading(false);
          return;
        }
        const tid = createJson.tid;
        setLinks({
          tid,
          unprotected_url: createJson.unprotected_url ?? "",
          protected_url: createJson.protected_url ?? "",
          unprotected_display: createJson.unprotected_display ?? createJson.unprotected_url ?? "",
          protected_display: createJson.protected_display ?? createJson.protected_url ?? "",
        });

        const scanRes = await fetch(DEMO_SCAN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tid }),
        });
        const scanJson = await scanRes.json().catch(() => ({})) as { error?: string };
        if (!scanRes.ok) {
          setError(formatApiError("Scan failed", scanRes.status, scanJson));
          setLinks(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load demo");
        setLinks(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section id="demo" className="py-20 sm:py-24" aria-label="Two-link demo">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <p className="text-center text-[var(--text2)] max-w-xl mx-auto">
            Email security tools often open links before you do.
          </p>
          <div className="mt-10 flex justify-center">
            <p className="text-sm text-[var(--muted)]">Loading demo…</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="demo" className="py-20 sm:py-24" aria-label="Two-link demo">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <p className="text-center text-[var(--text2)] max-w-xl mx-auto">
            Email security tools often open links before you do.
          </p>
          <div className="mt-10 flex justify-center">
            <p className="text-sm text-[var(--error-muted)]">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!links) return null;

  return (
    <section id="demo" className="py-20 sm:py-24" aria-label="Two-link demo">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <p className="text-center text-[var(--text2)] max-w-xl mx-auto">
          Email security tools often open links before you do.
        </p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col">
            <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
              Unprotected link
            </h3>
            <p className="mt-2 text-sm font-mono text-[var(--text2)] break-all" title={links.unprotected_url}>
              {links.unprotected_display}
            </p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              One-time link. A scanner already opened it — you’ll see “Link expired.”
            </p>
            <a
              href={links.unprotected_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              Open link
            </a>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col border-[var(--accent-dim)]">
            <h3 className="text-sm font-medium text-[var(--accent)] uppercase tracking-wide">
              Protected link
            </h3>
            <p className="mt-2 text-sm font-mono text-[var(--text2)] break-all" title={links.protected_url}>
              {links.protected_display}
            </p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Same “scanner” opened this one too. Click Continue on the next page — you’ll see Success.
            </p>
            <a
              href={links.protected_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--cta-text)] hover:opacity-90 transition-opacity"
            >
              Open link
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
