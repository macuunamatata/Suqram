"use client";

import { useState, useCallback, useEffect, useRef } from "react";

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

function LogLine({ line, onCopy }: { line: string; onCopy: () => void }) {
  return (
    <div className="demo-log-line">
      <code className="flex-1 truncate">{line}</code>
      <button type="button" onClick={onCopy} className="shrink-0">
        Copy
      </button>
    </div>
  );
}

export default function DemoBeforeAfter() {
  const [mode, setMode] = useState<Mode>("protected");
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeStep, setActiveStep] = useState<ActiveStep>(0);
  const [runId, setRunId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);

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

    if (prefersReducedMotion) {
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
  }, [prefersReducedMotion, clearTimers, mode]);

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
      const createJson = await createRes.json().catch(() => ({})) as { ok?: boolean; tid?: string; error?: string };
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
      const scanJson = await scanRes.json().catch(() => ({})) as { ok?: boolean; error?: string };
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

  return (
    <section className="py-12 sm:py-16" aria-label="Demo">
      <div className="mx-auto max-w-[640px] px-4 sm:px-6">
        <h2 className="section-h2 text-center">
          Proof: scanner vs interactive redemption
        </h2>
        <p className="mt-2 text-center text-[var(--text-secondary)] max-w-xl mx-auto text-sm sm:text-base">
          Simulate a scanner pre-open. Compare unprotected (token burns) vs protected (only interactive redemption counts).
        </p>

        <div className="demo-hero-inner mt-8">
          <div className="flex justify-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => onModeChange("unprotected")}
              className={`demo-toggle rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === "unprotected"
                  ? "bg-[var(--surface-hover)] text-[var(--text)] border border-[var(--border)]"
                  : "text-[var(--muted)] hover:text-[var(--text)] border border-transparent"
              }`}
            >
              Unprotected
            </button>
            <button
              type="button"
              onClick={() => onModeChange("protected")}
              className={`demo-toggle rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === "protected"
                  ? "bg-[var(--primary-muted)] text-[var(--primary)] border border-[var(--border)]"
                  : "text-[var(--muted)] hover:text-[var(--text)] border border-transparent"
              }`}
            >
              Protected
            </button>
          </div>

          <div className="demo-glass">
            <div className="demo-inner">
              <p className="text-[var(--text-secondary)] text-sm">Your sign-in link is ready.</p>
              <div className="mt-3 flex flex-col gap-1">
                <span className="demo-real-link">Sign in to Example</span>
                <p className="demo-url-preview truncate" title={previewUrl}>
                  {previewUrl}
                </p>
              </div>

              {/* Rail timeline: fixed column for line/dots, flexible for text */}
              <div className="demo-timeline-rail mt-8">
                <div className="demo-timeline-track">
                  <div className={`demo-timeline-dot ${activeStep >= 1 ? "active" : ""}`} />
                  <div className={`demo-timeline-line ${activeStep >= 2 ? "filled" : ""}`} />
                  <div className={`demo-timeline-dot ${activeStep >= 2 ? "active" : ""}`} />
                  <div className={`demo-timeline-line ${activeStep >= 3 ? "filled" : ""}`} />
                  <div className={`demo-timeline-dot ${activeStep >= 3 ? "active" : ""}`} />
                </div>
                <div className="demo-timeline-content">
                  <div className="demo-timeline-label">Scanner pre-open</div>
                  {showOutcomes && activeStep >= 1 && <div className="demo-timeline-outcome ok">Detected</div>}
                </div>
                <div className="demo-timeline-content">
                  <div className="demo-timeline-label">Redemption</div>
                  {showOutcomes && activeStep >= 2 && (
                    <div className={`demo-timeline-outcome ${mode === "unprotected" ? "bad" : "ok"}`}>
                      {mode === "unprotected" ? "Consumed" : "Blocked"}
                    </div>
                  )}
                </div>
                <div className="demo-timeline-content">
                  <div className="demo-timeline-label">Interactive redemption</div>
                  {showOutcomes && activeStep >= 3 && (
                    <div className={`demo-timeline-outcome ${mode === "unprotected" ? "bad" : "ok"}`}>
                      {mode === "unprotected" ? "Expired" : "Redeemed"}
                    </div>
                  )}
                </div>
              </div>

              {logLines.length > 0 && (
                <div className="demo-log" role="log" aria-label="Request log">
                  {logLines.map((line, i) => (
                    <LogLine
                      key={`${runId}-${i}-${line}`}
                      line={line}
                      onCopy={() => navigator.clipboard.writeText(line)}
                    />
                  ))}
                </div>
              )}

              {error && (
                <p className="mt-4 text-sm text-[var(--status-error)]" role="alert">
                  {error}
                </p>
              )}

              <div className="mt-6">
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
              <p className="mt-3 text-xs text-[var(--muted)]">
                No signup. Runs on suqram.com.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
