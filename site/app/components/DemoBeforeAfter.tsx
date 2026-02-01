"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type Clicked = null | "unprotected" | "protected";
type RunFirstLink = null | "unprotected" | "protected";

export default function DemoBeforeAfter() {
  const reduceMotion = useReducedMotion() ?? false;
  const [simulated, setSimulated] = useState(false);
  const [clicked, setClicked] = useState<Clicked>(null);
  const [runFirstLink, setRunFirstLink] = useState<RunFirstLink>(null);

  // When user clicks "Run demo" (href="#demo"), focus the simulate button after scroll
  useEffect(() => {
    const focusSimulate = () => {
      if (typeof window !== "undefined" && window.location.hash === "#demo") {
        const t = setTimeout(() => document.getElementById("demo-simulate")?.focus(), 150);
        return () => clearTimeout(t);
      }
    };
    focusSimulate();
    const onHash = () => { focusSimulate(); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const onSimulate = () => {
    setRunFirstLink(null);
    setClicked(null);
    setSimulated(true);
  };

  const onUnprotectedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!simulated) {
      setRunFirstLink("unprotected");
      return;
    }
    setClicked((c) => (c === "unprotected" ? null : "unprotected"));
  };

  const onProtectedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!simulated) {
      setRunFirstLink("protected");
      return;
    }
    setClicked((c) => (c === "protected" ? null : "protected"));
  };

  return (
    <section className="demo-section" aria-label="Demo">
      <div className="demo-wrap demo-email-snippet">
        <div className="demo-email">
          <header className="demo-email-header">
            <p className="demo-email-eyebrow">Your sign-in link is ready.</p>
            <button
              id="demo-simulate"
              type="button"
              className="demo-email-btn"
              onClick={onSimulate}
              disabled={simulated}
              aria-label="Simulate scanner pre-open"
            >
              Simulate scanner pre-open
            </button>
          </header>

          <div className="demo-email-links">
            {/* Broken today */}
            <div className="demo-link-row">
              <p className="demo-section-label">Broken today</p>
              <a
                href="#"
                className="demo-link"
                onClick={onUnprotectedClick}
                aria-label={simulated ? "Unprotected link" : "Run scanner simulation first"}
              >
                Sign in to Example
              </a>
              <p className={`demo-link-url ${simulated ? "demo-link-url-burned" : ""}`} aria-hidden>
                https://app.example.com/auth/verify?token=•••••••••
              </p>
              {!simulated && runFirstLink === "unprotected" && (
                <p className="demo-inline-hint" aria-live="polite">
                  Run scanner simulation first.
                </p>
              )}
              {simulated && (
                <>
                  <p className="demo-inline-outcome" aria-live="polite">
                    Token consumed by scanner → Link expired
                  </p>
                  <AnimatePresence>
                    {clicked === "unprotected" && (
                      <motion.p
                        className="demo-inline-result demo-inline-result-fail"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        aria-live="polite"
                      >
                        <IconX className="demo-inline-icon" aria-hidden />
                        Link expired
                      </motion.p>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            {/* Protected with Suqram */}
            <div className="demo-link-row">
              <p className="demo-section-label">Protected with Suqram</p>
              <a
                href="#"
                className="demo-link demo-link-protected"
                onClick={onProtectedClick}
                aria-label={simulated ? "Protected link" : "Run scanner simulation first"}
              >
                Sign in to Example
              </a>
              <p className="demo-link-url" aria-hidden>
                https://go.suqram.com/r/•••••••
              </p>
              {!simulated && runFirstLink === "protected" && (
                <p className="demo-inline-hint" aria-live="polite">
                  Run scanner simulation first.
                </p>
              )}
              {simulated && (
                <>
                  <p className="demo-inline-outcome demo-inline-outcome-ok" aria-live="polite">
                    Scanner views don&apos;t redeem → First real click succeeds
                  </p>
                  <AnimatePresence>
                    {clicked === "protected" && (
                      <motion.p
                        className="demo-inline-result demo-inline-result-ok"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        aria-live="polite"
                      >
                        <IconCheck className="demo-inline-icon" aria-hidden />
                        Signed in
                      </motion.p>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
