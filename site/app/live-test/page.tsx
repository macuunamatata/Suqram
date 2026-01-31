"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { getRailBaseUrl } from "@/lib/railBase";

type Session = { tid: string; normalLink: string; protectedLink: string };
type Status = {
  created_at: number;
  scanner_simulated_normal_count: number;
  scanner_simulated_protected_count: number;
  last_scanner_simulated_normal_at: number | null;
  last_scanner_simulated_protected_at: number | null;
  normal_user_result: string;
  protected_user_result: string;
  redeem_ok_at: number | null;
  control_first_hit_at: number | null;
};

const HEAD_LEN = 36;
const TAIL_LEN = 8;

function truncateUrl(url: string, headLen = HEAD_LEN, tailLen = TAIL_LEN): string {
  if (url.length <= headLen + tailLen + 4) return url;
  return `${url.slice(0, headLen)}…${url.slice(-tailLen)}`;
}

function formatTs(ts: number | null): string {
  if (ts == null) return "";
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function LiveTestPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState<"idle" | "create" | "simulate-normal" | "simulate-protected">("idle");
  const [errorCreate, setErrorCreate] = useState("");
  const [errorSimulate, setErrorSimulate] = useState("");
  const [showDetailsNormal, setShowDetailsNormal] = useState(false);
  const [showDetailsProtected, setShowDetailsProtected] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async (tid: string) => {
    const base = getRailBaseUrl();
    const res = await fetch(`${base}/test/status?tid=${encodeURIComponent(tid)}`);
    if (!res.ok) return;
    const data = await res.json();
    setStatus({
      created_at: data.created_at ?? 0,
      scanner_simulated_normal_count: data.scanner_simulated_normal_count ?? 0,
      scanner_simulated_protected_count: data.scanner_simulated_protected_count ?? 0,
      last_scanner_simulated_normal_at: data.last_scanner_simulated_normal_at ?? null,
      last_scanner_simulated_protected_at: data.last_scanner_simulated_protected_at ?? null,
      normal_user_result: data.normal_user_result ?? "available",
      protected_user_result: data.protected_user_result ?? "available",
      redeem_ok_at: data.redeem_ok_at ?? null,
      control_first_hit_at: data.control_first_hit_at ?? null,
    });
  }, []);

  // Poll every 2s for 10s after a simulate action, then stop
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  function startPolling() {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (!session) return;
    const tid = session.tid;
    let count = 0;
    pollIntervalRef.current = setInterval(() => {
      count++;
      fetchStatus(tid);
      if (count >= 5) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 2000);
  }

  async function copyToClipboard(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (_) {}
  }

  async function handleCreate() {
    setErrorCreate("");
    setLoading("create");
    try {
      const base = getRailBaseUrl();
      const res = await fetch(`${base}/test/create`, { method: "POST" });
      const text = await res.text();
      if (!res.ok) {
        setErrorCreate(text ? `HTTP ${res.status}: ${text.slice(0, 120)}` : `HTTP ${res.status}`);
        return;
      }
      let data: { ok?: boolean; error?: string; tid?: string; normalLink?: string; protectedLink?: string };
      try {
        data = JSON.parse(text);
      } catch {
        setErrorCreate("Invalid response");
        return;
      }
      if (!data.ok) {
        setErrorCreate(data.error ?? "Failed to create demo");
        return;
      }
      setSession({ tid: data.tid!, normalLink: data.normalLink!, protectedLink: data.protectedLink! });
      await fetchStatus(data.tid!);
    } catch (_) {
      setErrorCreate("Couldn't reach go.suqram.com API");
    } finally {
      setLoading("idle");
    }
  }

  async function handleSimulate(variant: "normal" | "protected") {
    if (!session) return;
    setErrorSimulate("");
    setLoading(variant === "normal" ? "simulate-normal" : "simulate-protected");
    try {
      const base = getRailBaseUrl();
      const res = await fetch(`${base}/test/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tid: session.tid, variant }),
      });
      const bodyText = await res.text();
      if (!res.ok) {
        setErrorSimulate(bodyText ? `HTTP ${res.status}: ${bodyText.slice(0, 120)}` : `HTTP ${res.status}`);
        return;
      }
      let data: { ok?: boolean; error?: string };
      try {
        data = JSON.parse(bodyText);
      } catch {
        setErrorSimulate("Invalid response");
        return;
      }
      if (!data.ok) {
        setErrorSimulate(data.error ?? "Simulate failed");
        return;
      }
      await fetchStatus(session.tid);
      startPolling();
    } catch (_) {
      setErrorSimulate("Couldn't reach go.suqram.com API");
    } finally {
      setLoading("idle");
    }
  }

  function handleOpenAsUser(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    if (session) {
      fetchStatus(session.tid);
      startPolling();
    }
  }

  // Parse rid from protected link (e.g. .../r/RID#u=...)
  function getRidFromProtectedLink(url: string): string | null {
    const m = url.match(/\/r\/([^/#?]+)/);
    return m ? m[1] : null;
  }

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">
          Simulate Safe Links
        </h1>
        <p className="mt-3 text-[var(--muted)] leading-relaxed">
          Scanners pre-open links. Normal links can be consumed before the user clicks. Protected links require a human-confirmed handoff.
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
            {errorCreate && (
              <p className="mt-3 text-sm text-[var(--error-muted)]" role="alert">
                {errorCreate}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Card 1: Normal link */}
              <div className="card card-padded card-gradient-top flex flex-col gap-4">
                <div>
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
                    Unprotected
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">Normal link</h3>
                </div>
                <div>
                  <p className={`text-lg font-medium ${status?.normal_user_result === "consumed_by_scanner" ? "text-[var(--warn)]" : "text-[var(--text)]"}`}>
                    {status?.normal_user_result === "consumed_by_scanner" ? "Consumed by scanner" : "Available"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Scanner simulated: {(status?.scanner_simulated_normal_count ?? 0)}×
                    {status?.last_scanner_simulated_normal_at != null && ` · ${formatTs(status?.last_scanner_simulated_normal_at ?? null)}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulate("normal")}
                    disabled={loading !== "idle"}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    {loading === "simulate-normal" ? "Simulating…" : "Simulate scanner open"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAsUser(session.normalLink)}
                    className="btn-ghost text-sm"
                  >
                    Open as user
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("normal", session.normalLink)}
                    className="btn-ghost text-sm"
                  >
                    {copiedId === "normal" ? "Copied" : "Copy link"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailsNormal((v) => !v)}
                  className="self-start text-xs text-[var(--muted)] underline hover:text-[var(--text)]"
                >
                  {showDetailsNormal ? "Hide details" : "Show details"}
                </button>
                {showDetailsNormal && (
                  <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="break-all font-mono text-xs text-[var(--text)]">{session.normalLink}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">tid: {session.tid}</p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("normal-full", session.normalLink)}
                      className="mt-2 text-xs text-[var(--accent)] hover:underline"
                    >
                      {copiedId === "normal-full" ? "Copied" : "Copy URL"}
                    </button>
                  </div>
                )}
              </div>

              {/* Card 2: Protected link */}
              <div className="card card-padded card-gradient-top flex flex-col gap-4">
                <div>
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
                    Scanner-proof rail
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">Protected link</h3>
                </div>
                <div>
                  <p className={`text-lg font-medium ${(status?.redeem_ok_at ?? null) != null ? "text-[var(--accent)]" : "text-[var(--accent)]"}`}>
                    {(status?.redeem_ok_at ?? null) != null ? "Redeemed successfully" : "Still valid for user"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Scanner simulated: {(status?.scanner_simulated_protected_count ?? 0)}×
                    {status?.last_scanner_simulated_protected_at != null && ` · ${formatTs(status?.last_scanner_simulated_protected_at ?? null)}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulate("protected")}
                    disabled={loading !== "idle"}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    {loading === "simulate-protected" ? "Simulating…" : "Simulate scanner open"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAsUser(session.protectedLink)}
                    className="btn-ghost text-sm"
                  >
                    Open as user
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("protected", session.protectedLink)}
                    className="btn-ghost text-sm"
                  >
                    {copiedId === "protected" ? "Copied" : "Copy link"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailsProtected((v) => !v)}
                  className="self-start text-xs text-[var(--muted)] underline hover:text-[var(--text)]"
                >
                  {showDetailsProtected ? "Hide details" : "Show details"}
                </button>
                {showDetailsProtected && (
                  <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="break-all font-mono text-xs text-[var(--text)]">{session.protectedLink}</p>
                    {getRidFromProtectedLink(session.protectedLink) && (
                      <p className="mt-1 text-xs text-[var(--muted)]">rid: {getRidFromProtectedLink(session.protectedLink)}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--muted)]">tid: {session.tid}</p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("protected-full", session.protectedLink)}
                      className="mt-2 text-xs text-[var(--accent)] hover:underline"
                    >
                      {copiedId === "protected-full" ? "Copied" : "Copy URL"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {errorSimulate && (
              <p className="text-sm text-[var(--error-muted)]" role="alert">
                {errorSimulate}
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
