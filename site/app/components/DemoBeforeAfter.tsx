"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Mode = "unprotected" | "protected";
type Phase = "idle" | "sweeping" | "step1" | "step2" | "step3" | "done";

const BEAT_MS = 550;

export default function DemoBeforeAfter() {
  const [mode, setMode] = useState<Mode>("unprotected");
  const [phase, setPhase] = useState<Phase>("idle");
  const [clickedUnprotected, setClickedUnprotected] = useState(false);
  const [clickedProtected, setClickedProtected] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const runSimulation = useCallback(() => {
    clearAllTimeouts();
    setClickedUnprotected(false);
    setClickedProtected(false);
    setPhase("sweeping");

    const t1 = setTimeout(() => {
      setPhase("step1");
    }, BEAT_MS);
    timeoutsRef.current.push(t1);

    const t2 = setTimeout(() => {
      setPhase("step2");
    }, BEAT_MS * 2);
    timeoutsRef.current.push(t2);

    const t3 = setTimeout(() => {
      setPhase("step3");
    }, BEAT_MS * 3);
    timeoutsRef.current.push(t3);

    const t4 = setTimeout(() => {
      setPhase("done");
    }, BEAT_MS * 4);
    timeoutsRef.current.push(t4);
  }, [clearAllTimeouts]);

  const onToggle = useCallback(
    (newMode: Mode) => {
      if (newMode === mode) return;
      clearAllTimeouts();
      setMode(newMode);
      setPhase("idle");
      setClickedUnprotected(false);
      setClickedProtected(false);
    },
    [mode, clearAllTimeouts]
  );

  const onSimulate = useCallback(() => {
    runSimulation();
  }, [runSimulation]);

  const onUnprotectedClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (phase !== "done") return;
    setClickedUnprotected(true);
  }, [phase]);

  const onProtectedClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (phase !== "done") return;
    setClickedProtected(true);
  }, [phase]);

  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  useEffect(() => {
    const focusSimulate = () => {
      if (typeof window !== "undefined" && window.location.hash === "#demo") {
        const t = setTimeout(() => document.getElementById("demo-simulate")?.focus(), 150);
        return () => clearTimeout(t);
      }
    };
    focusSimulate();
    const onHash = () => focusSimulate();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const stepActive =
    phase === "sweeping"
      ? 1
      : phase === "step1"
        ? 1
        : phase === "step2"
          ? 2
          : phase === "step3"
            ? 3
            : phase === "done"
              ? 3
              : 0;
  const showStep2Chip = stepActive >= 2;
  const showStep3Chip = stepActive >= 3;
  const burned = phase === "done";
  const stillValid = phase === "done";

  return (
    <section className="demo-premium" aria-label="Demo">
      <div className="demo-premium-inner">
        {/* Toggle: Unprotected / Protected */}
        <div className="demo-toggle-wrap">
          <div className="demo-toggle" role="tablist" aria-label="Demo mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "unprotected"}
              className={mode === "unprotected" ? "demo-toggle-btn demo-toggle-btn-active" : "demo-toggle-btn"}
              onClick={() => onToggle("unprotected")}
            >
              Unprotected
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "protected"}
              className={mode === "protected" ? "demo-toggle-btn demo-toggle-btn-active" : "demo-toggle-btn"}
              onClick={() => onToggle("protected")}
            >
              Protected
            </button>
          </div>
        </div>

        {/* Grid: rail (left) + content (right) */}
        <div className="demo-grid">
          {/* Rail */}
          <div className="demo-rail" aria-hidden>
            <div className="demo-rail-line" />
            <div className="demo-rail-steps">
              <div className={`demo-rail-step ${stepActive >= 1 ? "demo-rail-step-active" : ""}`}>
                <span className="demo-rail-dot" />
                <span className="demo-rail-label">Scanner view</span>
              </div>
              <div className={`demo-rail-step ${stepActive >= 2 ? "demo-rail-step-active" : ""}`}>
                <span className="demo-rail-dot" />
                <span className="demo-rail-label">Redeem attempt</span>
                {showStep2Chip ? (
                  <span className={mode === "unprotected" ? "demo-rail-chip demo-rail-chip-fail" : "demo-rail-chip demo-rail-chip-neutral"}>
                    {mode === "unprotected" ? "Consumed" : "Blocked"}
                  </span>
                ) : null}
              </div>
              <div className={`demo-rail-step ${stepActive >= 3 ? "demo-rail-step-active" : ""}`}>
                <span className="demo-rail-dot" />
                <span className="demo-rail-label">Interactive redemption</span>
                {showStep3Chip ? (
                  <span className={mode === "unprotected" ? "demo-rail-chip demo-rail-chip-fail" : "demo-rail-chip demo-rail-chip-ok"}>
                    {mode === "unprotected" ? "Expired" : "Signed in"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Content: real links */}
          <div className="demo-content">
            <p className="demo-content-eyebrow">Your sign-in link is ready.</p>

            <div className={`demo-links-block ${phase === "sweeping" ? "demo-links-sweep" : ""}`}>
              {/* Unprotected link */}
              <div className="demo-link-block">
                <a
                  href="#"
                  className={`demo-real-link ${burned ? "demo-real-link-burned" : ""}`}
                  onClick={onUnprotectedClick}
                  aria-label={phase === "done" ? "Unprotected link" : "Link"}
                >
                  Sign in to Example
                </a>
                <p className={`demo-real-url ${burned ? "demo-real-url-burned" : ""}`} aria-hidden>
                  https://app.example.com/auth/verify?token=•••••••••
                </p>
                {burned ? <span className="demo-link-chip demo-link-chip-fail">Expired</span> : null}
                {phase === "done" && clickedUnprotected ? (
                  <p className="demo-inline-msg demo-inline-msg-fail" aria-live="polite">
                    This link is expired.
                  </p>
                ) : null}
              </div>

              {/* Protected link */}
              <div className="demo-link-block">
                <a
                  href="#"
                  className="demo-real-link demo-real-link-protected"
                  onClick={onProtectedClick}
                  aria-label={phase === "done" ? "Protected link" : "Link"}
                >
                  Sign in to Example
                </a>
                <p className="demo-real-url" aria-hidden>
                  https://go.example.com/r/•••••••
                </p>
                <p className="demo-cname-helper" aria-hidden>
                  Uses your link domain (CNAME). End-users never see suqram.com.
                </p>
                {stillValid ? <span className="demo-link-chip demo-link-chip-ok">Still valid</span> : null}
                {phase === "done" && clickedProtected ? (
                  <p className="demo-inline-msg demo-inline-msg-ok" aria-live="polite">
                    Signed in.
                  </p>
                ) : null}
              </div>
            </div>

            <button
              id="demo-simulate"
              type="button"
              className="demo-cta-btn"
              onClick={onSimulate}
              disabled={phase !== "idle" && phase !== "done" ? true : false}
              aria-label="Simulate scanner pre-open"
            >
              Simulate scanner pre-open
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
