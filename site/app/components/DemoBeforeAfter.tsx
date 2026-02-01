"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type Clicked = null | "unprotected" | "protected";

export default function DemoBeforeAfter() {
  const reduceMotion = useReducedMotion() ?? false;
  const [clicked, setClicked] = useState<Clicked>(null);

  const handleUnprotected = (e: React.MouseEvent) => {
    e.preventDefault();
    setClicked("unprotected");
  };

  const handleProtected = (e: React.MouseEvent) => {
    e.preventDefault();
    setClicked("protected");
  };

  return (
    <section className="demo-section" aria-label="Demo">
      <div className="demo-wrap">
        <div className="demo-panel">
          <div className="demo-links">
            <a
              href="#"
              className="demo-link demo-link-unprotected"
              onClick={handleUnprotected}
              aria-label="Unprotected link — opens with error"
            >
              app.example.com/auth/verify?token=•••
            </a>
            <a
              href="#"
              className="demo-link demo-link-protected"
              onClick={handleProtected}
              aria-label="Protected link — opens successfully"
            >
              go.suqram.com/r/•••••••
            </a>
          </div>

          <AnimatePresence mode="wait">
            {clicked === "unprotected" && (
              <motion.div
                className="demo-result demo-result-error"
                key="error"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <IconX className="demo-result-icon" aria-hidden />
                <span>Link expired</span>
              </motion.div>
            )}
            {clicked === "protected" && (
              <motion.div
                className="demo-result demo-result-success"
                key="success"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <IconCheck className="demo-result-icon" aria-hidden />
                <span>Signed in</span>
              </motion.div>
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
