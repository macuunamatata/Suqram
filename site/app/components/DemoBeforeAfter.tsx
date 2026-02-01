"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const DEMO_CREATE_URL = "https://go.suqram.com/demo/create";
const DEMO_SCAN_URL = "https://go.suqram.com/demo/scan";

function formatApiError(prefix: string, status: number, data: { error?: string } | null): string {
  const part = data?.error ? `: ${data.error}` : "";
  return `${prefix} (${status})${part}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Status = "idle" | "running" | "done";

const TRACE_LINES = [
  "Scanner: opened link (view-only)",
  "Scanner: redemption blocked",
  "User: link still valid for interactive redemption",
] as const;

const UNPROTECTED_DISPLAY_URL = "https://app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_DISPLAY_URL = "https://go.suqram.com/r/••••••••••••";

const STEP_MS = 500;

export default function DemoBeforeAfter() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = m.matches;
    const h = () => {
      reduceMotionRef.current = m.matches;
    };
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);

  const runDemo = useCallback(async () => {
    setError(null);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    runIdRef.current += 1;
    const thisRunId = runIdRef.current;

    const bail = () => thisRunId !== runIdRef.current || signal.aborted;

    setStatus("running");

    let tid: string | null = null;
    try {
      const createRes = await fetch(DEMO_CREATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
      });
      const createJson = (await createRes.json().catch(() => ({}))) as { ok?: boolean; tid?: string; error?: string };
      if (bail()) return;
      if (!createRes.ok) {
        setError(formatApiError("Create failed", createRes.status, createJson));
        setStatus("idle");
        return;
      }
      if (!createJson?.ok || !createJson.tid) {
        setError("Invalid create response. Please try again.");
        setStatus("idle");
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
      if (bail()) return;
      if (!scanRes.ok) {
        setError(formatApiError("Scan failed", scanRes.status, scanJson));
        setStatus("idle");
        return;
      }
    } catch (e) {
      if (signal.aborted) return;
      abortRef.current = null;
      setError(e instanceof Error ? e.message : "Request failed");
      setStatus("idle");
      return;
    }

    abortRef.current = null;

    const reduceMotion = reduceMotionRef.current;
    if (reduceMotion) {
      setStatus("done");
      return;
    }

    await sleep(STEP_MS * 2);
    if (bail()) return;
    setStatus("done");
  }, []);

  const copyTrace = useCallback(() => {
    navigator.clipboard.writeText(TRACE_LINES.join("\n"));
  }, []);

  const showOutcomes = status === "done";
  const isRunning = status === "running";

  return (
    <section className="py-12 sm:py-16" aria-label="Demo">
      <div className="mx-auto max-w-[640px] px-4 sm:px-6 demoPanel">
        <h2 className="section-h2 text-center">
          Proof: scanner viewed vs user redeemed
        </h2>
        <p className="mt-2 text-center text-[var(--text-secondary)] max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          One link gets consumed when a scanner opens it. The other stays valid until a real user clicks.
        </p>

        <div className="demoPanel-inner mt-8">
          {/* Email snippet */}
          <div className="demoEmail">
            <p className="demoEmail-eyebrow">Your sign-in link is ready</p>
            <div className="demoEmail-row">
              <div className="demoEmail-rowInner">
                <span className="demoEmail-link">Sign in to Example</span>
                <span className="demoEmail-pill">unprotected</span>
              </div>
              <p className="demoEmail-url" title={UNPROTECTED_DISPLAY_URL}>
                {UNPROTECTED_DISPLAY_URL}
              </p>
            </div>
            <div className="demoEmail-row">
              <div className="demoEmail-rowInner">
                <span className="demoEmail-link">Sign in to Example</span>
                <span className="demoEmail-pill">protected</span>
              </div>
              <p className="demoEmail-url" title={PROTECTED_DISPLAY_URL}>
                {PROTECTED_DISPLAY_URL}
              </p>
            </div>
          </div>

          <hr className="demoPanel-divider" aria-hidden />

          {/* Primary CTA — label + 3-dot pulse on right when running */}
          <button
            type="button"
            onClick={runDemo}
            disabled={isRunning}
            className="demoPanel-cta"
            aria-busy={isRunning}
            aria-live="polite"
          >
            <span>Simulate scanner pre-open</span>
            {isRunning && (
              <span className="demoPanel-ctaDots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            )}
          </button>

          {showOutcomes && (
            <div className="demoOutcomes">
              <div className="demoOutcome" data-status="expired">
                <div className="demoOutcome-header">
                  <IconX className="demoOutcome-icon" aria-hidden />
                  <p className="demoOutcome-title">Expired</p>
                </div>
                <p className="demoOutcome-desc">Token was consumed by scanner.</p>
                <p className="demoOutcome-why">Scanners that open links consume one-time tokens.</p>
              </div>
              <div className="demoOutcome" data-status="valid">
                <div className="demoOutcome-header">
                  <IconCheck className="demoOutcome-icon" aria-hidden />
                  <p className="demoOutcome-title">Still valid</p>
                </div>
                <p className="demoOutcome-desc">Scanner views don&apos;t redeem.</p>
                <p className="demoOutcome-why">Only interactive redemption counts.</p>
              </div>
            </div>
          )}

          {showOutcomes && (
            <details className="demoDetails">
              <summary className="demoDetails-summary">
                <ChevronIcon className="demoDetails-chevron" aria-hidden />
                View trace
              </summary>
              <div className="demoTrace-block">
                <button
                  type="button"
                  className="demoTrace-copy"
                  onClick={copyTrace}
                  title="Copy trace"
                  aria-label="Copy trace"
                >
                  <CopyIcon />
                </button>
                <div className="demoTrace-lines">
                  {TRACE_LINES.map((line, i) => (
                    <p key={i} className="demoTrace-line">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </details>
          )}

          {error && (
            <p className="text-sm text-[var(--status-error)]" role="alert">
              {error}
            </p>
          )}

          <p className="demoPanel-footer">
            No signup. Runs on suqram.com.
          </p>
        </div>
      </div>
    </section>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
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
