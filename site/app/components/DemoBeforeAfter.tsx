"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const STEPS = ["Scanner view", "Redeem attempt", "Interactive redemption"] as const;
const STEP_DURATION_MS = 600;

type Clicked = null | "unprotected" | "protected";

export default function DemoBeforeAfter() {
  const reduceMotion = useReducedMotion() ?? false;
  const [simulated, setSimulated] = useState(false);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [clicked, setClicked] = useState<Clicked>(null);
  const [showRunFirst, setShowRunFirst] = useState(false);

  const runSimulation = useCallback(async () => {
    setShowRunFirst(false);
    if (running) return;
    setRunning(true);
    setStepIndex(0);
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await delay(STEP_DURATION_MS);
    setStepIndex(1);
    await delay(STEP_DURATION_MS);
    setStepIndex(2);
    await delay(STEP_DURATION_MS);
    setSimulated(true);
    setRunning(false);
  }, [running]);

  const handleUnprotected = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!simulated) return;
    setClicked((c) => (c === "unprotected" ? null : "unprotected"));
  };

  const handleProtected = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!simulated) return;
    setClicked((c) => (c === "protected" ? null : "protected"));
  };

  const handleLinkClickBeforeSim = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowRunFirst(true);
  };

  return (
    <section className="demo-section" aria-label="Demo">
      <div className="demo-wrap">
        <div className="demo-panel">
          <div className="demo-actions">
            <button
              type="button"
              className="demo-btn-primary"
              onClick={runSimulation}
              disabled={running || simulated}
              aria-label="Simulate scanner pre-open"
            >
              {running ? "Simulating…" : simulated ? "Simulated" : "Simulate scanner pre-open"}
            </button>
            {!simulated && !showRunFirst && (
              <p className="demo-hint" aria-live="polite">
                Run the simulation, then click a link.
              </p>
            )}
          </div>

          <div className="demo-trace" role="status" aria-label="Simulation steps">
            {STEPS.map((label, i) => (
              <span key={label} className="demo-trace-segment">
                <span
                  className={`demo-trace-step ${stepIndex === i ? "demo-trace-step-active" : stepIndex !== null && i < stepIndex ? "demo-trace-step-done" : ""}`}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && <span className="demo-trace-arrow" aria-hidden> → </span>}
              </span>
            ))}
          </div>

          <div className="demo-link-blocks">
            <div className="demo-link-block">
              <a
                href="#"
                className={`demo-link demo-link-unprotected ${!simulated ? "demo-link-disabled" : ""}`}
                onClick={simulated ? handleUnprotected : handleLinkClickBeforeSim}
                aria-label={simulated ? "Unprotected link — opens with error" : "Run scanner simulation first"}
              >
                app.example.com/auth/verify?token=•••
              </a>
              {simulated && (
                <motion.div
                  className="demo-outcome demo-outcome-expired"
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="demo-outcome-label">
                    <IconX className="demo-outcome-icon" aria-hidden /> Expired
                  </span>
                  <span className="demo-outcome-sub">Token consumed by scanner</span>
                  <AnimatePresence>
                    {clicked === "unprotected" && (
                      <motion.span
                        className="demo-outcome-inline"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Link expired
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            <div className="demo-link-block">
              <a
                href="#"
                className={`demo-link demo-link-protected ${!simulated ? "demo-link-disabled" : ""}`}
                onClick={simulated ? handleProtected : handleLinkClickBeforeSim}
                aria-label={simulated ? "Protected link — opens successfully" : "Run scanner simulation first"}
              >
                go.suqram.com/r/•••••••
              </a>
              {simulated && (
                <motion.div
                  className="demo-outcome demo-outcome-valid"
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="demo-outcome-label">
                    <IconCheck className="demo-outcome-icon" aria-hidden /> Still valid
                  </span>
                  <span className="demo-outcome-sub">Scanner views don&apos;t redeem</span>
                  <AnimatePresence>
                    {clicked === "protected" && (
                      <motion.span
                        className="demo-outcome-inline"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Signed in
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showRunFirst && !simulated && (
              <motion.p
                className="demo-run-first"
                aria-live="polite"
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                Run scanner simulation first
              </motion.p>
            )}
          </AnimatePresence>
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
