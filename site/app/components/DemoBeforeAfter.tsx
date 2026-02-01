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

/** Human-readable trace lines — no HTTP verbs or paths */
const TRACE_LINES = [
  "Scanner: opened link (view-only)",
  "Scanner: redemption blocked",
  "User: link still valid for interactive redemption",
] as const;

/** Pretty URLs for UI only — never show /l/ or /v/ */
const UNPROTECTED_DISPLAY_URL = "https://app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_DISPLAY_URL = "https://go.suqram.com/r/••••••••••••";

const STEP_MS = 500;

export default function DemoBeforeAfter() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
      <div className="mx-auto max-w-[640px] px-4 sm:px-6 demoWidget">
        <h2 className="section-h2 text-center">
          Proof: scanner viewed vs user redeemed
        </h2>
        <p className="mt-2 text-center text-[var(--text-secondary)] max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          One link gets consumed when a scanner opens it. The other stays valid until a real user clicks.
        </p>

        <div className="demoWidget-header mt-8">
          <div className="demoEmail">
            <p className="demoEmail-label">Your sign-in link is ready</p>
            <p className="demoEmail-linkRow">
              <span className="demoEmail-link">Sign in to Example</span>
              <span className="demoEmail-linkMeta">(unprotected)</span>
            </p>
            <p className="demoEmail-url" title={UNPROTECTED_DISPLAY_URL}>
              {UNPROTECTED_DISPLAY_URL}
            </p>
            <p className="demoEmail-linkRow mt-4">
              <span className="demoEmail-link">Sign in to Example</span>
              <span className="demoEmail-linkMeta">(protected)</span>
            </p>
            <p className="demoEmail-url" title={PROTECTED_DISPLAY_URL}>
              {PROTECTED_DISPLAY_URL}
            </p>
          </div>

          <div className="demoProof">
            <button
              type="button"
              onClick={runDemo}
              disabled={isRunning}
              className="demoWidget-btn"
              aria-busy={isRunning}
              aria-live="polite"
            >
              {isRunning ? (
                <span className="demoWidget-btnDots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                "Simulate scanner pre-open"
              )}
            </button>

            {showOutcomes && (
              <div className="demoOutcomes">
                <div className="demoOutcome demoOutcome-bad">
                  <p className="demoOutcome-title">Expired</p>
                  <p className="demoOutcome-desc">Token was consumed by scanner.</p>
                  <p className="demoOutcome-why">Scanners that open links consume one-time tokens.</p>
                </div>
                <div className="demoOutcome demoOutcome-ok">
                  <p className="demoOutcome-title">Still valid</p>
                  <p className="demoOutcome-desc">Scanner views don&apos;t redeem.</p>
                  <p className="demoOutcome-why">Only interactive redemption counts.</p>
                </div>
              </div>
            )}

            {showOutcomes && (
              <details className="demoDetails">
                <summary className="demoDetails-summary">Trace</summary>
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
              <p className="mt-4 text-sm text-[var(--status-error)]" role="alert">
                {error}
              </p>
            )}

            <p className="demoWidget-footerNote mt-4">
              No signup. Runs on suqram.com.
            </p>
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
