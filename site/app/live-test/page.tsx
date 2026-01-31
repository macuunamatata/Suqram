"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { getRailBaseUrl } from "@/lib/railBase";

type Session = { tid: string; normalLink: string; protectedLink: string };
type Status = {
  created_at: number;
  normal_scanner_seen_at: number | null;
  protected_scanner_seen_at: number | null;
  normal_user_result: string;
  protected_user_result: string;
};

export default function LiveTestPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState<"idle" | "create" | "simulate-normal" | "simulate-protected">("idle");
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async (tid: string) => {
    const base = getRailBaseUrl();
    const res = await fetch(`${base}/test/status?tid=${encodeURIComponent(tid)}`);
    if (!res.ok) return;
    const data = await res.json();
    setStatus({
      created_at: data.created_at,
      normal_scanner_seen_at: data.normal_scanner_seen_at ?? null,
      protected_scanner_seen_at: data.protected_scanner_seen_at ?? null,
      normal_user_result: data.normal_user_result ?? "available",
      protected_user_result: data.protected_user_result ?? "available",
    });
  }, []);

  async function handleCreate() {
    setError("");
    setLoading("create");
    try {
      const base = getRailBaseUrl();
      const res = await fetch(`${base}/test/create`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to create demo");
        return;
      }
      setSession({ tid: data.tid, normalLink: data.normalLink, protectedLink: data.protectedLink });
      await fetchStatus(data.tid);
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading("idle");
    }
  }

  async function handleSimulate(variant: "normal" | "protected") {
    if (!session) return;
    setError("");
    setLoading(variant === "normal" ? "simulate-normal" : "simulate-protected");
    try {
      const base = getRailBaseUrl();
      const res = await fetch(`${base}/test/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tid: session.tid, variant }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Simulate failed");
        return;
      }
      await fetchStatus(session.tid);
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading("idle");
    }
  }

  function formatTs(ts: number | null): string {
    if (ts == null) return "";
    return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">
          Simulate Safe Links
        </h1>
        <p className="mt-3 text-[var(--muted)] leading-relaxed">
          This demo simulates how Safe Links / security scanners pre-open links.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
          Normal links can be consumed before the user clicks. Protected links require a human-confirmed handoff.
        </p>

        {!session ? (
          <div className="mt-10">
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading !== "idle"}
              className="btn-hero disabled:opacity-50"
            >
              {loading === "create" ? "Creating…" : "Start demo"}
            </button>
            {error && (
              <p className="mt-4 text-sm text-error-muted" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            <div className="card card-padded card-gradient-top space-y-4">
              <div>
                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">A) Normal link (unprotected)</p>
                <p className="mt-1 break-all text-sm font-mono text-[var(--text)]">{session.normalLink}</p>
                {status?.normal_scanner_seen_at != null && (
                  <p className="mt-2 text-xs text-[var(--warn)]">
                    Consumed by scanner (simulated) at {formatTs(status.normal_scanner_seen_at)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">B) Protected Rail link</p>
                <p className="mt-1 break-all text-sm font-mono text-[var(--text)]">{session.protectedLink}</p>
                {status?.protected_scanner_seen_at != null && (
                  <p className="mt-2 text-xs text-[var(--accent)]">
                    Scanner fetch ignored at {formatTs(status.protected_scanner_seen_at)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleSimulate("normal")}
                disabled={loading !== "idle"}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {loading === "simulate-normal" ? "Simulating…" : "Simulate scanner open (Normal)"}
              </button>
              <button
                type="button"
                onClick={() => handleSimulate("protected")}
                disabled={loading !== "idle"}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {loading === "simulate-protected" ? "Simulating…" : "Simulate scanner open (Protected)"}
              </button>
            </div>

            <div>
              <p className="text-xs text-[var(--muted)] mb-2">Click as user (opens both links)</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={session.normalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm"
                >
                  Open Normal link
                </a>
                <a
                  href={session.protectedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm"
                >
                  Open Protected link
                </a>
              </div>
            </div>

            {error && (
              <p className="text-sm text-error-muted" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        <p className="mt-10 text-sm text-[var(--muted)]">
          <Link href="/" className="link-accent">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
