"use client";

import { useState, useCallback, useEffect } from "react";
import { getRailBaseUrl } from "@/lib/railBase";

type Phase = "idle" | "scanning" | "scanned" | "user";
type VisibleSteps = 0 | 1 | 2;

const UNPROTECTED_PILL = "app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_PILL = "go.suqram.com/r/••••••••••••";

const STEP1_MS = 250;
const STEP2_MS = 650;
const SCAN_DONE_MS = 1450;

export default function DemoBeforeAfter() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [visibleSteps, setVisibleSteps] = useState<VisibleSteps>(0);
  const [openAsUser, setOpenAsUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(m.matches);
    const handler = () => setPrefersReducedMotion(m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  const runScannerPreOpen = useCallback(async () => {
    setError(null);
    setPhase("scanning");
    setVisibleSteps(0);

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
      setVisibleSteps(0);
      return;
    }

    if (prefersReducedMotion) {
      setVisibleSteps(2);
      setPhase("scanned");
      return;
    }

    const t1 = setTimeout(() => setVisibleSteps(1), STEP1_MS);
    const t2 = setTimeout(() => setVisibleSteps(2), STEP2_MS);
    const t3 = setTimeout(() => setPhase("scanned"), SCAN_DONE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [prefersReducedMotion]);

  const openAsUserClick = useCallback(() => {
    setPhase("user");
    setOpenAsUser(true);
  }, []);

  return (
    <section id="demo" className="demo-before-after py-20 sm:py-24" aria-label="Before / After demo">
      <div
        className="mx-auto w-full max-w-[1000px] px-4 sm:px-6"
        data-phase={phase}
      >
        <h2 className="section-h2 text-center">
          See Safe Links break a magic link — in 5 seconds.
        </h2>
        <p className="mt-3 text-center text-[var(--text2)] max-w-xl mx-auto">
          Security scanners pre-open links. One-time tokens get consumed.
        </p>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 min-h-[320px]">
          {/* Before (Unprotected) */}
          <div className="demo-column rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 flex flex-col">
            <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
              Before (Unprotected)
            </h3>
            <div className="mt-6 flex-1 flex flex-col">
              <div className="demo-link-pill relative overflow-hidden">
                <span className="demo-pill-text font-mono text-sm sm:text-base text-[var(--text2)] truncate relative z-[1]">
                  {UNPROTECTED_PILL}
                </span>
                <span className="demo-pill-sheen" aria-hidden="true" />
                <span className="demo-pill-orb" aria-hidden="true" />
              </div>
              <div className="mt-6 demo-timeline flex flex-col gap-3">
                <div className={`demo-timeline-item ${visibleSteps >= 1 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot" />
                  <span>Scanner opened the link</span>
                </div>
                <div className={`demo-timeline-item ${visibleSteps >= 1 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot demo-timeline-dot-red" />
                  <span className="text-[var(--error-muted)]">Token consumed</span>
                </div>
                <div className={`demo-timeline-item ${visibleSteps >= 2 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot" />
                  <span>User clicks the link</span>
                </div>
                <div className={`demo-timeline-item ${visibleSteps >= 2 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot demo-timeline-dot-x" aria-hidden>×</span>
                  <span className="text-[var(--error-muted)]">Link expired</span>
                </div>
              </div>
              {openAsUser && (
                <div className="demo-status-card demo-status-card-error mt-6" role="status">
                  <span className="demo-status-icon demo-status-icon-x" aria-hidden>×</span>
                  <span>Link expired</span>
                </div>
              )}
            </div>
          </div>

          {/* After (Protected by Suqram) */}
          <div className="demo-column rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 flex flex-col border-[var(--accent-dim)]">
            <h3 className="text-sm font-medium text-[var(--accent)] uppercase tracking-wide">
              After (Protected by Suqram)
            </h3>
            <div className="mt-6 flex-1 flex flex-col">
              <div className="demo-link-pill demo-link-pill-right relative overflow-hidden">
                <span className="demo-pill-text font-mono text-sm sm:text-base text-[var(--text2)] truncate relative z-[1]">
                  {PROTECTED_PILL}
                </span>
                <span className="demo-pill-sheen" aria-hidden="true" />
                <span className="demo-pill-orb" aria-hidden="true" />
              </div>
              <div className="mt-6 demo-timeline flex flex-col gap-3">
                <div className={`demo-timeline-item ${visibleSteps >= 1 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot" />
                  <span>Scanner opened the link</span>
                </div>
                <div className={`demo-timeline-item ${visibleSteps >= 1 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot demo-timeline-dot-green" />
                  <span className="text-[var(--accent)]">No token consumed</span>
                </div>
                <div className={`demo-timeline-item ${visibleSteps >= 2 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot" />
                  <span>User clicks the link</span>
                </div>
                <div className={`demo-timeline-item ${visibleSteps >= 2 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot demo-timeline-dot-check" aria-hidden>✓</span>
                  <span className="text-[var(--accent)]">Still valid</span>
                </div>
              </div>
              {openAsUser && (
                <div className="demo-status-card demo-status-card-success mt-6" role="status">
                  <span className="demo-status-icon demo-status-icon-check" aria-hidden>✓</span>
                  <span>Success — user redeemed</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-[var(--error-muted)]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={runScannerPreOpen}
            disabled={phase === "scanning"}
            className="btn-primary min-w-[200px] disabled:opacity-60 disabled:pointer-events-none"
          >
            {phase === "scanning" ? "Running scan…" : "Run scanner pre-open"}
          </button>
          <button
            type="button"
            onClick={openAsUserClick}
            disabled={phase !== "scanned"}
            className="btn-secondary min-w-[200px] disabled:opacity-50 disabled:pointer-events-none"
          >
            Open as user
          </button>
        </div>
      </div>
    </section>
  );
}
