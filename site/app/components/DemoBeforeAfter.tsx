"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getRailBaseUrl } from "@/lib/railBase";

type Mode = "unprotected" | "protected";
type Phase = "idle" | "scanning" | "scanned" | "user";
type ActiveRow = 0 | 1 | 2 | 3;

const UNPROTECTED_URL = "https://app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_URL = "https://go.suqram.com/r/••••••••••••";

const ROW1_MS = 650;
const ROW2_MS = 1400;
const SCAN_DONE_MS = 2000;
const ROW3_MS = 300;
const JUST_ENABLED_MS = 800;

export default function DemoBeforeAfter() {
  const [mode, setMode] = useState<Mode>("protected");
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeRow, setActiveRow] = useState<ActiveRow>(0);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [justEnabledUserBtn, setJustEnabledUserBtn] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(m.matches);
    const handler = () => setPrefersReducedMotion(m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!justEnabledUserBtn) return;
    const t = setTimeout(() => setJustEnabledUserBtn(false), JUST_ENABLED_MS);
    return () => clearTimeout(t);
  }, [justEnabledUserBtn]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const runScannerPreOpen = useCallback(async () => {
    setError(null);
    setPhase("scanning");
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
      setActiveRow(2);
      setPhase("scanned");
      setJustEnabledUserBtn(true);
      return;
    }

    const t1 = setTimeout(() => setActiveRow(1), ROW1_MS);
    const t2 = setTimeout(() => setActiveRow(2), ROW2_MS);
    const t3 = setTimeout(() => {
      setPhase("scanned");
      setJustEnabledUserBtn(true);
    }, SCAN_DONE_MS);
    timersRef.current = [t1, t2, t3];
    return () => clearTimers();
  }, [prefersReducedMotion, clearTimers]);

  const openAsUserClick = useCallback(() => {
    setPhase("user");
    if (prefersReducedMotion) {
      setActiveRow(3);
    } else {
      const t = setTimeout(() => setActiveRow(3), ROW3_MS);
      timersRef.current = [t];
    }
  }, [prefersReducedMotion]);

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
        data-row={activeRow}
      >
        <h2 className="section-h2 text-center">
          Watch a scanner burn a token — then see it fail.
        </h2>
        <p className="mt-3 text-center text-[var(--text2)] max-w-xl mx-auto text-base sm:text-lg">
          Simulate a security scanner pre-open. Compare unprotected vs protected links.
        </p>

        {/* Spacing: +24–32px between title/subtitle and demo */}
        <div className="demo-hero-inner mt-10 sm:mt-12">
          {/* Mode toggle — closer to link, 40px height, tactile */}
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

          {/* Soft glass plate: link + event log only */}
          <div className="demo-glass relative rounded-[32px] p-8 sm:p-10">
            {/* Ambient waterline gradient (idle) */}
            <div className="demo-waterline" aria-hidden />

            {/* Email snippet + link */}
            <div className="demo-email-line relative">
              <p className="text-[var(--text2)] text-lg sm:text-xl">Your sign-in link is ready.</p>
              <div className="mt-4 flex flex-col items-start gap-2">
                <button
                  type="button"
                  className="demo-real-link relative inline-block text-left"
                  aria-disabled={phase !== "idle" && phase !== "user"}
                  tabIndex={phase === "scanning" || phase === "scanned" ? -1 : 0}
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

            {/* Orbs: scan phase flies to row 1 then row 2; user phase flies to row 3 */}
            {phase === "scanning" && (
              <>
                <span className="demo-orb demo-orb-scan" data-target="1" aria-hidden />
                <span className="demo-orb demo-orb-scan" data-target="2" aria-hidden />
              </>
            )}
            {phase === "user" && <span className="demo-orb demo-orb-user" data-target="3" aria-hidden />}

            {/* Event log — system trace style, 16–18px */}
            <div className="demo-event-log mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)]">
              <div className={`demo-event-row ${activeRow >= 1 ? "demo-event-row-visible" : ""}`} data-row="1">
                <span className="demo-event-dot" />
                <span className="demo-event-label">Scanner request detected</span>
                {activeRow >= 1 && <span className="demo-event-ok">✓</span>}
              </div>
              <div className={`demo-event-row ${activeRow >= 2 ? "demo-event-row-visible" : ""} ${activeRow >= 2 ? (mode === "unprotected" ? "demo-event-row-bad" : "demo-event-row-ok") : ""}`} data-row="2">
                <span className="demo-event-dot" />
                <span className="demo-event-label">Redemption attempt</span>
                {activeRow >= 2 && mode === "unprotected" && (
                  <span className="demo-event-outcome demo-event-bad">Token consumed ×</span>
                )}
                {activeRow >= 2 && mode === "protected" && (
                  <span className="demo-event-outcome demo-event-ok">Blocked — no redemption ✓</span>
                )}
              </div>
              <div className={`demo-event-row ${activeRow >= 3 ? "demo-event-row-visible" : ""} ${activeRow >= 3 ? (mode === "unprotected" ? "demo-event-row-bad" : "demo-event-row-ok") : ""}`} data-row="3">
                <span className="demo-event-dot" />
                <span className="demo-event-label">User click</span>
                {activeRow >= 3 && mode === "unprotected" && (
                  <span className="demo-event-outcome demo-event-bad">Link expired ×</span>
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

          {/* Buttons directly under event log — primary 52–56px, 16–18px text */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={runScannerPreOpen}
              disabled={phase === "scanning"}
              className="demo-btn-primary"
            >
              {phase === "scanning" ? (
                <>
                  <span>Running scan</span>
                  <span className="demo-btn-dots" aria-hidden>
                    <span /><span /><span />
                  </span>
                </>
              ) : (
                "Run scanner pre-open"
              )}
            </button>
            <button
              type="button"
              onClick={openAsUserClick}
              disabled={phase !== "scanned"}
              className={`demo-btn-secondary ${justEnabledUserBtn ? "demo-just-enabled" : ""}`}
            >
              Click as user
            </button>
            {(phase === "scanned" || phase === "user") && (
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
