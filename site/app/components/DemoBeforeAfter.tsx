"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

const DEMO_CREATE_URL = "https://go.suqram.com/demo/create";
const DEMO_SCAN_URL = "https://go.suqram.com/demo/scan";

function formatApiError(prefix: string, status: number, data: { error?: string } | null): string {
  const part = data?.error ? `: ${data.error}` : "";
  return `${prefix} (${status})${part}`;
}

type Mode = "unprotected" | "protected";
type Phase = "idle" | "running" | "done";
type ActiveStep = 0 | 1 | 2 | 3;

const UNPROTECTED_URL = "https://app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_URL = "https://go.suqram.com/l/auth/verify?token=••••••••••••";

const STEP2_MS = 600;
const STEP3_MS = 1200;
const DONE_MS = 1800;

const LOG_LINES = {
  step1: "GET /l/... (scanner pre-open)",
  step2Unprotected: "POST /v/... (scanner consumed token)",
  step2Protected: "POST /v/... (scanner blocked)",
  step3Unprotected: "GET /l/... (user → expired)",
  step3Protected: "POST /v/... (interactive redemption)",
};

const STEP_LABELS = ["Scanner pre-open", "Redemption attempt", "Interactive redemption"] as const;

function getPill(step: 1 | 2 | 3, mode: Mode): { label: string; ok: boolean } {
  if (step === 1) return { label: "Detected", ok: true };
  if (step === 2) return { label: mode === "unprotected" ? "Consumed" : "Blocked", ok: mode === "protected" };
  return { label: mode === "unprotected" ? "Expired" : "Redeemed", ok: mode === "protected" };
}

const STEP_STAGGER = 0.06;
const DURATION = 0.2;

export default function DemoBeforeAfter() {
  const reduceMotion = useReducedMotion() ?? false;
  const [mode, setMode] = useState<Mode>("protected");
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeStep, setActiveStep] = useState<ActiveStep>(0);
  const [runId, setRunId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const cancelRun = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearTimers();
    setPhase("idle");
    setActiveStep(0);
    setError(null);
    setLogLines([]);
  }, [clearTimers]);

  const startRun = useCallback(() => {
    clearTimers();
    setPhase("running");
    setActiveStep(1);
    setRunId((r) => r + 1);
    setLogLines([LOG_LINES.step1]);

    if (reduceMotion) {
      setActiveStep(3);
      setPhase("done");
      setLogLines([
        LOG_LINES.step1,
        mode === "unprotected" ? LOG_LINES.step2Unprotected : LOG_LINES.step2Protected,
        mode === "unprotected" ? LOG_LINES.step3Unprotected : LOG_LINES.step3Protected,
      ]);
      return;
    }

    const t2 = setTimeout(() => {
      setActiveStep(2);
      setLogLines((prev) => [...prev, mode === "unprotected" ? LOG_LINES.step2Unprotected : LOG_LINES.step2Protected]);
    }, STEP2_MS);
    const t3 = setTimeout(() => {
      setActiveStep(3);
      setLogLines((prev) => [...prev, mode === "unprotected" ? LOG_LINES.step3Unprotected : LOG_LINES.step3Protected]);
    }, STEP3_MS);
    const t4 = setTimeout(() => {
      setPhase("done");
    }, DONE_MS);
    timersRef.current = [t2, t3, t4];
  }, [reduceMotion, clearTimers, mode]);

  const runDemo = useCallback(async () => {
    setError(null);
    cancelRun();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setPhase("running");
    setActiveStep(1);
    setRunId((r) => r + 1);
    setLogLines([LOG_LINES.step1]);

    let tid: string | null = null;

    try {
      const createRes = await fetch(DEMO_CREATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
      });
      const createJson = (await createRes.json().catch(() => ({}))) as { ok?: boolean; tid?: string; error?: string };
      if (!createRes.ok) {
        setError(formatApiError("Create failed", createRes.status, createJson));
        setPhase("idle");
        setActiveStep(0);
        setLogLines([]);
        return;
      }
      if (!createJson?.ok || !createJson.tid) {
        setError("Invalid create response. Please try again.");
        setPhase("idle");
        setActiveStep(0);
        setLogLines([]);
        return;
      }
      tid = createJson.tid;

      const scanRes = await fetch(DEMO_SCAN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tid }),
        signal,
      });
      const scanJson = (await scanRes.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!scanRes.ok) {
        setError(formatApiError("Scan failed", scanRes.status, scanJson));
        setPhase("idle");
        setActiveStep(0);
        setLogLines([]);
        return;
      }
    } catch (e) {
      if (signal.aborted) return;
      abortRef.current = null;
      const message = e instanceof Error ? e.message : "Request failed";
      setError(message);
      setPhase("idle");
      setActiveStep(0);
      setLogLines([]);
      return;
    }

    abortRef.current = null;
    startRun();
  }, [startRun, cancelRun]);

  const onModeChange = useCallback(
    (newMode: Mode) => {
      cancelRun();
      setMode(newMode);
    },
    [cancelRun]
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  const previewUrl = mode === "unprotected" ? UNPROTECTED_URL : PROTECTED_URL;
  const showOutcomes = phase === "running" || phase === "done";
  const railFillHeight = activeStep === 0 ? 0 : (activeStep / 3) * 100;

  const copyLogs = useCallback(() => {
    if (logLines.length) navigator.clipboard.writeText(logLines.join("\n"));
  }, [logLines]);

  const transition = reduceMotion ? { duration: 0, delay: 0 } : { duration: DURATION, ease: [0.25, 0.1, 0.25, 1] };

  return (
    <section className="py-12 sm:py-16" aria-label="Demo">
      <div className="mx-auto max-w-[640px] px-4 sm:px-6 demoWidget">
        <h2 className="section-h2 text-center">
          Proof: scanner vs interactive redemption
        </h2>
        <p className="mt-2 text-center text-[var(--text-secondary)] max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          Simulate a scanner pre-open. Compare unprotected (token burns) vs protected (only interactive redemption counts).
        </p>

        <div className="demoWidget-header">
          <div className="flex justify-center mb-5">
            <div className="demoWidget-segmented" role="tablist" aria-label="Link type">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "unprotected"}
                aria-controls="demo-content"
                id="demo-tab-unprotected"
                data-selected={mode === "unprotected"}
                className="demoWidget-segmentedOption"
                onClick={() => onModeChange("unprotected")}
              >
                Unprotected
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "protected"}
                aria-controls="demo-content"
                id="demo-tab-protected"
                data-selected={mode === "protected"}
                className="demoWidget-segmentedOption demoWidget-segmentedProtected"
                onClick={() => onModeChange("protected")}
              >
                Protected
              </button>
            </div>
          </div>

          <div id="demo-content">
            <div className="demoEmail">
              <p className="demoEmail-label">Your sign-in link is ready</p>
              <span className="demoEmail-link">Sign in to Example</span>
              <p className="demoEmail-url" title={previewUrl}>
                {previewUrl}
              </p>
            </div>

            <div className="demoTrace">
              <div className="demoTrace-grid">
                <div className="demoRail">
                  <div className="demoRail-track" aria-hidden />
                  <motion.div
                    className="demoRail-fill"
                    aria-hidden
                    initial={false}
                    animate={{ height: `${railFillHeight}%` }}
                    transition={transition}
                  />
                  <div className={`demoRail-dot ${activeStep >= 1 ? "active" : ""}`} data-step="1" aria-hidden />
                  <div className={`demoRail-dot ${activeStep >= 2 ? "active" : ""}`} data-step="2" aria-hidden />
                  <div className={`demoRail-dot ${activeStep >= 3 ? "active" : ""}`} data-step="3" aria-hidden />
                </div>
                {([0, 1, 2] as const).map((i) => (
                  <motion.div
                    key={`step-${runId}-${i}`}
                    className="demoStep"
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: DURATION, delay: i * STEP_STAGGER, ease: [0.25, 0.1, 0.25, 1] }
                    }
                  >
                    <span className="demoStep-label">{STEP_LABELS[i]}</span>
                    {showOutcomes && activeStep >= i + 1 && (
                      <motion.span
                        className={`demoPill ${getPill((i + 1) as 1 | 2 | 3, mode).ok ? "demoPill-ok" : "demoPill-bad"}`}
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        {getPill((i + 1) as 1 | 2 | 3, mode).label}
                      </motion.span>
                    )}
                  </motion.div>
                ))}
              </div>

              {logLines.length > 0 && (
                <div className="demoTerminal" role="log" aria-label="Request log">
                  <button
                    type="button"
                    className="demoTerminal-copy"
                    onClick={copyLogs}
                    title="Copy logs"
                    aria-label="Copy logs"
                  >
                    <CopyIcon />
                  </button>
                  {logLines.map((line, i) => (
                    <motion.div
                      key={`${runId}-${i}-${line}`}
                      className="demoTerminal-line"
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { duration: DURATION, delay: i * STEP_STAGGER, ease: [0.25, 0.1, 0.25, 1] }
                      }
                    >
                      <code>{line}</code>
                    </motion.div>
                  ))}
                </div>
              )}

              {error && (
                <p className="mt-4 text-sm text-[var(--status-error)]" role="alert">
                  {error}
                </p>
              )}

              <div className="demoWidget-footer">
                <button
                  type="button"
                  onClick={runDemo}
                  disabled={phase === "running"}
                  className="demoWidget-btn"
                  aria-busy={phase === "running"}
                  aria-live="polite"
                >
                  {phase === "running" ? (
                    <span className="demoWidget-btnDots" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    "Run demo"
                  )}
                </button>
                <p className="demoWidget-footerNote">
                  No signup. Runs on suqram.com.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
