"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

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

const UNPROTECTED_URL = "https://app.example.com/auth/verify?token=••••••••••••";
const PROTECTED_URL = "https://go.suqram.com/r/••••••••••••";

const STEP_MS = 500;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DemoBeforeAfter() {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = m.matches;
    const h = () => { reduceMotionRef.current = m.matches; };
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
        setError("Invalid response. Try again.");
        setStatus("idle");
        return;
      }

      const scanRes = await fetch(DEMO_SCAN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tid: createJson.tid }),
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
    if (reduceMotionRef.current) {
      setStatus("done");
      return;
    }
    await sleep(1000);
    if (bail()) return;
    setStatus("done");
  }, []);

  const copyTrace = useCallback(() => {
    navigator.clipboard.writeText(TRACE_LINES.join("\n"));
  }, []);

  const done = status === "done";
  const running = status === "running";

  return (
    <section className="demo-section" aria-label="Product demo">
      <div className="demo-wrap">
        {/* Narrative: See it in action */}
        <p className="demo-label">See it in action</p>
        <h2 className="demo-headline">
          Same email. A scanner opens the link. One burns, one stays valid.
        </h2>
        <p className="demo-sub">
          Your user gets this email with two sign-in links. Hit the button to simulate what happens when a security scanner opens the link first.
        </p>

        <div className="demo-panel">
          {/* Email mock */}
          <div className="demo-email">
            <p className="demo-email-from">Acme &lt;auth@acme.com&gt;</p>
            <p className="demo-email-subject">Sign in to your account</p>
            <div className="demo-email-body">
              <p className="demo-email-line">
                <span className="demo-email-link">Sign in (unprotected)</span>
              </p>
              <p className="demo-email-url">{UNPROTECTED_URL}</p>
              <p className="demo-email-line demo-email-line-second">
                <span className="demo-email-link">Sign in (protected)</span>
              </p>
              <p className="demo-email-url">{PROTECTED_URL}</p>
            </div>
          </div>

          {/* Single CTA */}
          <div className="demo-action">
            <button
              type="button"
              onClick={runDemo}
              disabled={running}
              className="demo-btn"
              aria-busy={running}
              aria-live="polite"
            >
              {running ? (
                <>
                  <span>Simulating…</span>
                  <span className="demo-btn-dots" aria-hidden>
                    <span /><span /><span />
                  </span>
                </>
              ) : (
                "Simulate scanner opening the link"
              )}
            </button>
          </div>

          {/* Result: side-by-side comparison */}
          {done && (
            <motion.div
              className="demo-result"
              variants={prefersReducedMotion ? undefined : container}
              initial="hidden"
              animate="show"
            >
              <motion.div
                className="demo-card demo-card-bad"
                variants={prefersReducedMotion ? undefined : item}
              >
                <p className="demo-card-label">Without Suqram</p>
                <div className="demo-card-head">
                  <IconX className="demo-card-icon" aria-hidden />
                  <p className="demo-card-title">Link expired</p>
                </div>
                <p className="demo-card-body">The scanner consumed the token. User sees an error and can&apos;t sign in.</p>
                <p className="demo-card-why">Scanners that open links burn one-time tokens.</p>
              </motion.div>
              <motion.div
                className="demo-card demo-card-good"
                variants={prefersReducedMotion ? undefined : item}
              >
                <p className="demo-card-label">With Suqram</p>
                <div className="demo-card-head">
                  <IconCheck className="demo-card-icon" aria-hidden />
                  <p className="demo-card-title">Still valid</p>
                </div>
                <p className="demo-card-body">Scanner viewed it; only a real click redeems. User can still sign in.</p>
                <p className="demo-card-why">Only interactive redemption counts.</p>
              </motion.div>
            </motion.div>
          )}

          {done && (
            <div className="demo-cta-wrap">
              <Link href="/start" className="demo-cta-link">
                Protect your links →
              </Link>
            </div>
          )}

          {done && (
            <details className="demo-details">
              <summary className="demo-details-summary">
                <ChevronIcon className="demo-details-chevron" aria-hidden />
                View trace
              </summary>
              <div className="demo-trace">
                <button
                  type="button"
                  className="demo-trace-copy"
                  onClick={copyTrace}
                  title="Copy trace"
                  aria-label="Copy trace"
                >
                  <CopyIcon />
                </button>
                <div className="demo-trace-lines">
                  {TRACE_LINES.map((line, i) => (
                    <p key={i} className="demo-trace-line">{line}</p>
                  ))}
                </div>
              </div>
            </details>
          )}

          {error && (
            <p className="demo-error" role="alert">
              {error}
            </p>
          )}

          <p className="demo-footer">
            No signup. Runs on Suqram&apos;s edge.
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
