"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getRailBaseUrl } from "@/lib/railBase";

type Mode = "unprotected" | "protected";
type Phase = "idle" | "running" | "done";
type ActiveStep = 0 | 1 | 2 | 3;

const UNPROTECTED_URL = "https://app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_URL = "https://go.suqram.com/r/••••••••••••";

const STEP2_MS = 650;
const STEP3_MS = 1300;
const DONE_MS = 1700;

export default function DemoBeforeAfter() {
  const [mode, setMode] = useState<Mode>("protected");
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeStep, setActiveStep] = useState<ActiveStep>(0);
  const [hasRun, setHasRun] = useState(false);
  const [runId, setRunId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isFirstMount = useRef(true);

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

  const startRun = useCallback(() => {
    clearTimers();
    setPhase("running");
    setActiveStep(1);
    setRunId((r) => r + 1);

    if (prefersReducedMotion) {
      setActiveStep(3);
      setPhase("done");
      setHasRun(true);
      return;
    }

    const t2 = setTimeout(() => setActiveStep(2), STEP2_MS);
    const t3 = setTimeout(() => setActiveStep(3), STEP3_MS);
    const t4 = setTimeout(() => {
      setPhase("done");
      setHasRun(true);
    }, DONE_MS);
    timersRef.current = [t2, t3, t4];
  }, [prefersReducedMotion, clearTimers]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    startRun();
  }, [mode, startRun]);

  const runDemo = useCallback(async () => {
    setError(null);
    clearTimers();
    setPhase("running");
    setActiveStep(1);
    setRunId((r) => r + 1);

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
      setActiveStep(0);
      return;
    }

    startRun();
  }, [startRun, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const previewUrl = mode === "unprotected" ? UNPROTECTED_URL : PROTECTED_URL;
  const showOutcomes = hasRun || phase === "running" || phase === "done";

  return (
    <section id="demo" className="demo-before-after py-16 sm:py-24" aria-label="Email link demo">
      <div
        className="demo-hero mx-auto w-[92vw] max-w-[980px] px-4 sm:px-6"
        data-phase={phase}
        data-mode={mode}
        data-active-step={activeStep}
        data-run-id={runId}
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
              className={`demo-toggle px-5 py-2.5 text-base font-medium rounded-full transition-colors h-10 ${
                mode === "unprotected"
                  ? "bg-[rgba(255,255,255,0.08)] text-[var(--text)]"
                  : "text-[var(--muted)] hover:text-[var(--text2)]"
              }`}
            >
              Unprotected
            </button>
            <span className="text-[var(--muted)] self-center px-1" aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setMode("protected")}
              className={`demo-toggle px-5 py-2.5 text-base font-medium rounded-full transition-colors h-10 ${
                mode === "protected"
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--text2)]"
              }`}
            >
              Protected by Suqram
            </button>
          </div>

          <div className="demo-glass relative rounded-[32px] p-8 sm:p-10">
            <div className="demo-waterline" aria-hidden />

            <div className="demo-email-line relative z-[1]">
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

            <div className="demo-steps mt-10">
              <svg
                className="demo-steps-svg"
                width={28}
                height={216}
                viewBox="0 0 28 216"
                aria-hidden
              >
                <line className="demo-steps-line" x1={14} y1={10} x2={14} y2={206} />
                <circle className="demo-steps-node" cx={14} cy={36} r={5} />
                <circle className="demo-steps-node" cx={14} cy={108} r={5} />
                <circle className="demo-steps-node" cx={14} cy={180} r={5} />
                <circle className="demo-signal-dot" cx={14} cy={36} r={4} />
              </svg>

              <div className={`demo-step-block ${activeStep >= 1 ? "demo-step-block-active" : ""}`}>
                <div className="demo-step-head">
                  <span className="demo-step-label">Scanner pre-open</span>
                </div>
                <div className="demo-step-outcome">
                  {showOutcomes && activeStep >= 1 && (
                    <span key={`step1-${runId}`} className="demo-step-outcome-text demo-step-outcome-ok demo-outcome-visible">
                      Detected ✓
                    </span>
                  )}
                </div>
              </div>

              <div className={`demo-step-block ${activeStep >= 2 ? "demo-step-block-active" : ""} ${activeStep >= 2 ? (mode === "unprotected" ? "demo-step-block-bad" : "demo-step-block-ok") : ""}`}>
                <div className="demo-step-head">
                  <span className="demo-step-label">Redemption</span>
                </div>
                <div className="demo-step-outcome">
                  {showOutcomes && activeStep >= 2 && (
                    <span key={`step2-${mode}-${runId}`} className={`demo-step-outcome-text demo-outcome-visible ${mode === "unprotected" ? "demo-step-outcome-bad" : "demo-step-outcome-ok"}`}>
                      {mode === "unprotected" ? "Consumed ×" : "Blocked ✓"}
                    </span>
                  )}
                </div>
              </div>

              <div className={`demo-step-block ${activeStep >= 3 ? "demo-step-block-active" : ""} ${activeStep >= 3 ? (mode === "unprotected" ? "demo-step-block-bad" : "demo-step-block-ok") : ""}`}>
                <div className="demo-step-head">
                  <span className="demo-step-label">User click</span>
                </div>
                <div className="demo-step-outcome">
                  {showOutcomes && activeStep >= 3 && (
                    <span key={`step3-${mode}-${runId}`} className={`demo-step-outcome-text demo-outcome-visible ${mode === "unprotected" ? "demo-step-outcome-bad" : "demo-step-outcome-ok"}`}>
                      {mode === "unprotected" ? "Expired ×" : "Redeemed ✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-[var(--error-muted)]" role="alert">
              {error}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-center">
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
          </div>
          <p className="mt-4 text-center text-sm text-[var(--muted)]">
            No signup. Runs entirely on suqram.com.
          </p>
        </div>
      </div>
    </section>
  );
}
