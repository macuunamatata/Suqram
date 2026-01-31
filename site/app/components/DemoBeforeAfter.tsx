"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getRailBaseUrl } from "@/lib/railBase";

type Mode = "unprotected" | "protected";
type Phase = "idle" | "running" | "done";
type ActiveRow = 0 | 1 | 2 | 3;

const UNPROTECTED_URL = "https://app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_URL = "https://go.suqram.com/r/••••••••••••";

const ROW1_MS = 450;
const ROW2_MS = 1100;
const ROW3_MS = 1750;
const DONE_MS = 2200;

export default function DemoBeforeAfter() {
  const [mode, setMode] = useState<Mode>("protected");
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeRow, setActiveRow] = useState<ActiveRow>(0);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(m.matches);
    const handler = () => setPrefersReducedMotion(m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const runDemo = useCallback(async () => {
    setError(null);
    setPhase("running");
    setActiveRow(0);
    clearTimers();

    const base = getRailBaseUrl();
    let tid: string | null = null;

    try {
      const createRes = await fetch(`${base}/demo/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        throw new Error(data?.error ?? `Create failed: ${createRes.status}`);
      }
      const createData = await createRes.json();
      if (!createData.ok || !createData.tid) throw new Error("Invalid create response");
      tid = createData.tid;

      const scanRes = await fetch(`${base}/demo/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tid }),
      });
      if (!scanRes.ok) {
        const data = await scanRes.json().catch(() => ({}));
        throw new Error(data?.error ?? `Scan failed: ${scanRes.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setPhase("idle");
      setActiveRow(0);
      return;
    }

    if (prefersReducedMotion) {
      setActiveRow(3);
      setPhase("done");
      return;
    }

    const t1 = setTimeout(() => setActiveRow(1), ROW1_MS);
    const t2 = setTimeout(() => setActiveRow(2), ROW2_MS);
    const t3 = setTimeout(() => setActiveRow(3), ROW3_MS);
    const t4 = setTimeout(() => setPhase("done"), DONE_MS);
    timersRef.current = [t1, t2, t3, t4];
    return () => clearTimers();
  }, [prefersReducedMotion, clearTimers]);

  const resetDemo = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setActiveRow(0);
    setError(null);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const previewUrl = mode === "unprotected" ? UNPROTECTED_URL : PROTECTED_URL;

  return (
    <section id="demo" className="demo-before-after py-16 sm:py-24" aria-label="Email link demo">
      <div
        className="demo-hero mx-auto w-[92vw] max-w-[980px] px-4 sm:px-6"
        data-phase={phase}
        data-mode={mode}
        data-active-row={activeRow}
      >
        <h2 className="section-h2 text-center">
          Watch a scanner burn a token — then see it fail.
        </h2>
        <p className="mt-3 text-center text-[var(--text2)] max-w-xl mx-auto text-base sm:text-lg">
          Simulate a security scanner pre-open. Compare unprotected vs protected links.
        </p>

        <div className="demo-hero-inner mt-10 sm:mt-12">
          <div className="flex justify-center gap-1 mb-8">
            <button
              type="button"
              onClick={() => setMode("unprotected")}
              disabled={phase !== "idle"}
              className={`demo-toggle px-5 py-2.5 text-base font-medium rounded-full transition-colors h-10 ${
                mode === "unprotected"
                  ? "bg-[rgba(255,255,255,0.08)] text-[var(--text)]"
                  : "text-[var(--muted)] hover:text-[var(--text2)]"
              } ${phase !== "idle" ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Unprotected
            </button>
            <span className="text-[var(--muted)] self-center px-1" aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setMode("protected")}
              disabled={phase !== "idle"}
              className={`demo-toggle px-5 py-2.5 text-base font-medium rounded-full transition-colors h-10 ${
                mode === "protected"
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--text2)]"
              } ${phase !== "idle" ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Protected by Suqram
            </button>
          </div>

          <div className="demo-glass relative rounded-[32px] p-8 sm:p-10">
            <div className="demo-waterline" aria-hidden />

            <div className="demo-email-line relative">
              <p className="text-[var(--text2)] text-lg sm:text-xl">Your sign-in link is ready.</p>
              <div className="mt-4 flex flex-col items-start gap-2">
                <button
                  type="button"
                  className="demo-real-link relative inline-block text-left"
                  aria-disabled
                  tabIndex={-1}
                >
                  <span className="demo-real-link-inner">
                    <span className="demo-real-link-text">Sign in to Example</span>
                    <span className="demo-underline" aria-hidden />
                  </span>
                  <span className="demo-beam" aria-hidden />
                </button>
                <p className="demo-url-preview text-[var(--muted)] truncate max-w-full" title={previewUrl}>
                  {previewUrl}
                </p>
              </div>
            </div>

            {phase === "running" && (
              <>
                <span className="demo-orb demo-orb-scan" data-target="1" aria-hidden />
                <span className="demo-orb demo-orb-scan" data-target="2" aria-hidden />
                <span className="demo-orb demo-orb-user" data-target="3" aria-hidden />
              </>
            )}

            <div className="demo-event-log mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)]">
              <div className={`demo-event-row ${activeRow >= 1 ? "demo-event-row-visible" : ""}`} data-row="1">
                <span className="demo-event-dot" />
                <span className="demo-event-label">Scanner pre-open</span>
                {activeRow >= 1 && <span className="demo-event-ok">Detected ✓</span>}
              </div>
              <div className={`demo-event-row ${activeRow >= 2 ? "demo-event-row-visible" : ""} ${activeRow >= 2 ? (mode === "unprotected" ? "demo-event-row-bad" : "demo-event-row-ok") : ""}`} data-row="2">
                <span className="demo-event-dot" />
                <span className="demo-event-label">Redemption</span>
                {activeRow >= 2 && mode === "unprotected" && (
                  <span className="demo-event-outcome demo-event-bad">Consumed ×</span>
                )}
                {activeRow >= 2 && mode === "protected" && (
                  <span className="demo-event-outcome demo-event-ok">Blocked ✓</span>
                )}
              </div>
              <div className={`demo-event-row ${activeRow >= 3 ? "demo-event-row-visible" : ""} ${activeRow >= 3 ? (mode === "unprotected" ? "demo-event-row-bad" : "demo-event-row-ok") : ""}`} data-row="3">
                <span className="demo-event-dot" />
                <span className="demo-event-label">User click</span>
                {activeRow >= 3 && mode === "unprotected" && (
                  <span className="demo-event-outcome demo-event-bad">Expired ×</span>
                )}
                {activeRow >= 3 && mode === "protected" && (
                  <span className="demo-event-outcome demo-event-ok">Redeemed ✓</span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-[var(--error-muted)]" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={runDemo}
              disabled={phase === "running"}
              className="demo-btn-primary"
            >
              {phase === "running" ? (
                <>
                  <span>Running…</span>
                  <span className="demo-btn-dots" aria-hidden>
                    <span /><span /><span />
                  </span>
                </>
              ) : (
                "Run demo"
              )}
            </button>
            {phase === "done" && (
              <button type="button" onClick={resetDemo} className="demo-btn-ghost">
                Reset
              </button>
            )}
          </div>
          <p className="mt-4 text-center text-sm text-[var(--muted)]">
            No signup. Runs entirely on suqram.com.
          </p>
        </div>
      </div>
    </section>
  );
}
