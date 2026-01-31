"use client";

import { useState, useCallback } from "react";
import { getRailBaseUrl } from "@/lib/railBase";

type Phase = "idle" | "running" | "scanned";
type TimelineStep = 0 | 1 | 2 | 3 | 4;

const UNPROTECTED_PILL = "app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_PILL = "go.suqram.com/r/••••••••••••";

const TIMELINE_DELAY_MS = 600;

export default function DemoBeforeAfter() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [timelineStep, setTimelineStep] = useState<TimelineStep>(0);
  const [openAsUser, setOpenAsUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScannerPreOpen = useCallback(async () => {
    setError(null);
    setPhase("running");
    setTimelineStep(0);

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
      setTimelineStep(0);
      return;
    }

    setTimelineStep(1);
    const t1 = setTimeout(() => setTimelineStep(2), TIMELINE_DELAY_MS);
    const t2 = setTimeout(() => setTimelineStep(3), TIMELINE_DELAY_MS * 2);
    const t3 = setTimeout(() => setTimelineStep(4), TIMELINE_DELAY_MS * 3);
    const t4 = setTimeout(() => setPhase("scanned"), TIMELINE_DELAY_MS * 4);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <section id="demo" className="demo-before-after py-20 sm:py-24" aria-label="Before / After demo">
      <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-6">
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
              <div className="demo-link-pill demo-link-pill-left">
                <span className="font-mono text-sm sm:text-base text-[var(--text2)] truncate">
                  {UNPROTECTED_PILL}
                </span>
              </div>
              <div className="mt-6 demo-timeline flex flex-col gap-3">
                <div className={`demo-timeline-item ${timelineStep >= 1 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot" />
                  <span>Scanner opened the link</span>
                </div>
                <div className={`demo-timeline-item ${timelineStep >= 2 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot demo-timeline-dot-red" />
                  <span className="text-[var(--error-muted)]">Token consumed</span>
                </div>
                <div className={`demo-timeline-item ${timelineStep >= 3 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot" />
                  <span>User clicks the link</span>
                </div>
                <div className={`demo-timeline-item ${timelineStep >= 4 ? "demo-timeline-visible" : ""}`}>
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
              <div className="demo-link-pill demo-link-pill-right">
                <span className="font-mono text-sm sm:text-base text-[var(--text2)] truncate">
                  {PROTECTED_PILL}
                </span>
              </div>
              <div className="mt-6 demo-timeline flex flex-col gap-3">
                <div className={`demo-timeline-item ${timelineStep >= 1 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot" />
                  <span>Scanner opened the link</span>
                </div>
                <div className={`demo-timeline-item ${timelineStep >= 2 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot demo-timeline-dot-green" />
                  <span className="text-[var(--accent)]">No token consumed</span>
                </div>
                <div className={`demo-timeline-item ${timelineStep >= 3 ? "demo-timeline-visible" : ""}`}>
                  <span className="demo-timeline-dot" />
                  <span>User clicks the link</span>
                </div>
                <div className={`demo-timeline-item ${timelineStep >= 4 ? "demo-timeline-visible" : ""}`}>
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
            disabled={phase === "running"}
            className="btn-primary min-w-[200px] disabled:opacity-60 disabled:pointer-events-none"
          >
            {phase === "running" ? "Running…" : "Run scanner pre-open"}
          </button>
          <button
            type="button"
            onClick={() => setOpenAsUser(true)}
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
