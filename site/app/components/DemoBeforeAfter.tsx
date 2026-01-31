"use client";

import { useState, useCallback, useEffect } from "react";
import { getRailBaseUrl } from "@/lib/railBase";

type Mode = "unprotected" | "protected";
type Phase = "idle" | "scanning" | "scanned" | "user";
type VisibleRows = 0 | 1 | 2 | 3;

const UNPROTECTED_URL = "https://app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_URL = "https://go.suqram.com/r/••••••••••••";

const ROW1_MS = 250;
const ROW2_MS = 700;
const SCAN_DONE_MS = 1500;
const JUST_ENABLED_MS = 600;

export default function DemoBeforeAfter() {
  const [mode, setMode] = useState<Mode>("protected");
  const [phase, setPhase] = useState<Phase>("idle");
  const [visibleRows, setVisibleRows] = useState<VisibleRows>(0);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [justEnabledUserBtn, setJustEnabledUserBtn] = useState(false);

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

  const runScannerPreOpen = useCallback(async () => {
    setError(null);
    setPhase("scanning");
    setVisibleRows(0);

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
      setVisibleRows(0);
      return;
    }

    if (prefersReducedMotion) {
      setVisibleRows(2);
      setPhase("scanned");
      setJustEnabledUserBtn(true);
      return;
    }

    const t1 = setTimeout(() => setVisibleRows(1), ROW1_MS);
    const t2 = setTimeout(() => setVisibleRows(2), ROW2_MS);
    const t3 = setTimeout(() => {
      setPhase("scanned");
      setJustEnabledUserBtn(true);
    }, SCAN_DONE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [prefersReducedMotion]);

  const openAsUserClick = useCallback(() => {
    setPhase("user");
    if (prefersReducedMotion) {
      setVisibleRows(3);
    } else {
      setTimeout(() => setVisibleRows(3), 100);
    }
  }, [prefersReducedMotion]);

  const resetDemo = useCallback(() => {
    setPhase("idle");
    setVisibleRows(0);
    setError(null);
  }, []);

  const previewUrl = mode === "unprotected" ? UNPROTECTED_URL : PROTECTED_URL;

  return (
    <section id="demo" className="demo-before-after py-20 sm:py-24" aria-label="Email link demo">
      <div
        className="mx-auto w-full max-w-[640px] px-4 sm:px-6"
        data-phase={phase}
        data-mode={mode}
      >
        <h2 className="section-h2 text-center">
          Watch a scanner burn a token — then see it fail.
        </h2>
        <p className="mt-3 text-center text-[var(--text2)] max-w-xl mx-auto">
          Simulate a security scanner pre-open. Compare unprotected vs protected links.
        </p>

        {/* Mode toggle — no boxes */}
        <div className="mt-10 flex justify-center gap-1">
          <button
            type="button"
            onClick={() => setMode("unprotected")}
            disabled={phase !== "idle"}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
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
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              mode === "protected"
                ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--text2)]"
            } ${phase !== "idle" ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            Protected by Suqram
          </button>
        </div>

        {/* Email snippet + event log in one relative container for packet positioning */}
        <div className="relative mt-8">
          <div className="demo-email-line">
          <p className="text-[var(--text2)] text-sm">Your sign-in link is ready.</p>
          <div className="mt-3 flex flex-col items-start gap-1">
            <button
              type="button"
              className="demo-real-link relative inline-block text-left"
              aria-disabled={phase !== "idle" && phase !== "user"}
              tabIndex={phase === "scanning" || phase === "scanned" ? -1 : 0}
            >
              <span className="relative z-[1]">Sign in to Example</span>
              <span className="demo-sweep" aria-hidden />
            </button>
            <p className="text-xs font-mono text-[var(--muted)] truncate max-w-full" title={previewUrl}>
              {previewUrl}
            </p>
          </div>
          </div>

          {/* Packet(s) — scan: drop to row 1 then row 2; user: drop to row 3 */}
          {phase === "scanning" && <span className="demo-packet demo-packet-scan" aria-hidden />}
          {phase === "user" && <span className="demo-packet demo-packet-user" aria-hidden />}

          {/* Event log — inline, not boxed */}
          <div className="demo-event-log mt-8 space-y-2">
          <div className={`demo-event-row ${visibleRows >= 1 ? "demo-event-row-visible" : ""}`}>
            <span className="demo-event-dot" />
            <span className="flex-1 text-sm text-[var(--text2)]">Scanner request detected</span>
            {visibleRows >= 1 && (
              <span className="demo-event-ok text-sm" aria-hidden>✓</span>
            )}
          </div>
          <div className={`demo-event-row ${visibleRows >= 2 ? "demo-event-row-visible" : ""}`}>
            <span className="demo-event-dot" />
            <span className="flex-1 text-sm text-[var(--text2)]">Token redemption attempt</span>
            {visibleRows >= 2 && mode === "unprotected" && (
              <span className="demo-event-bad text-sm">Token consumed ×</span>
            )}
            {visibleRows >= 2 && mode === "protected" && (
              <span className="demo-event-ok text-sm">No redemption (blocked) ✓</span>
            )}
          </div>
          <div className={`demo-event-row ${visibleRows >= 3 ? "demo-event-row-visible" : ""}`}>
            <span className="demo-event-dot" />
            <span className="flex-1 text-sm text-[var(--text2)]">User click</span>
            {visibleRows >= 3 && mode === "unprotected" && (
              <span className="demo-event-bad text-sm">Link expired ×</span>
            )}
            {visibleRows >= 3 && mode === "protected" && (
              <span className="demo-event-ok text-sm">Redeemed successfully ✓</span>
            )}
          </div>
        </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-[var(--error-muted)]" role="alert">
            {error}
          </p>
        )}

        {/* Buttons — minimal, no big container */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={runScannerPreOpen}
            disabled={phase === "scanning"}
            className="demo-btn-primary min-w-[180px]"
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
            className={`demo-btn-secondary min-w-[140px] ${justEnabledUserBtn ? "demo-just-enabled" : ""}`}
          >
            Click as user
          </button>
          {(phase === "scanned" || phase === "user") && (
            <button
              type="button"
              onClick={resetDemo}
              className="demo-btn-ghost min-w-[80px]"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
