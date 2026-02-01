"use client";

import { useState, useEffect } from "react";

type RunFirstLink = null | "unprotected" | "protected";

export default function DemoBeforeAfter() {
  const [simulated, setSimulated] = useState(false);
  const [clicked, setClicked] = useState<null | "protected">(null);
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
                <div className="demo-outcomes-inline" aria-live="polite">
                  <p className="demo-outcome-row demo-outcome-row-fail">Scanner pre-open: Consumes token</p>
                  <p className="demo-outcome-row demo-outcome-row-fail">User click: Expired</p>
                </div>
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
                https://go.example.com/r/•••••••
              </p>
              <p className="demo-url-helper" aria-hidden>
                Uses your link domain (CNAME). Customers never see suqram.com.
              </p>
              {!simulated && runFirstLink === "protected" && (
                <p className="demo-inline-hint" aria-live="polite">
                  Run scanner simulation first.
                </p>
              )}
              {simulated && (
                <div className="demo-outcomes-inline" aria-live="polite">
                  <p className="demo-outcome-row demo-outcome-row-neutral">Scanner pre-open: View-only</p>
                  {clicked === "protected" ? (
                    <p className="demo-outcome-row demo-outcome-row-ok">
                      <IconCheck className="demo-inline-icon" aria-hidden />
                      User click: Signed in
                    </p>
                  ) : (
                    <p className="demo-outcome-row demo-outcome-row-neutral">User click: —</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
