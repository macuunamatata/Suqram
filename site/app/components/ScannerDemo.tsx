"use client";

import { useState, useCallback } from "react";
import { Check, X } from "lucide-react";

type Result = null | {
  kind: "success" | "error";
  title: string;
  detail: string;
};

export default function ScannerDemo() {
  const [result, setResult] = useState<Result>(null);

  const showError = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    setResult({
      kind: "error",
      title: "Error",
      detail: "preview bot blocked. Token NOT consumed.",
    });
  }, []);

  const showSuccess = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    setResult({
      kind: "success",
      title: "Success",
      detail: "link opened by a human. Token NOT consumed by preview.",
    });
  }, []);

  const onUnsafeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showError(e);
      }
    },
    [showError]
  );

  const onSafeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showSuccess(e);
      }
    },
    [showSuccess]
  );

  return (
    <div className="scanner-demo">
      <div className="scanner-demo__chrome">
        <div className="scanner-demo__titlebar">
          <span className="scanner-demo__dot" />
          <span className="scanner-demo__dot" />
          <span className="scanner-demo__dot" />
          <span className="scanner-demo__title">Link preview</span>
        </div>
        <div className="scanner-demo__body">
          <p className="scanner-demo__label">Click a link to simulate opening it:</p>
          <div className="scanner-demo__links">
            <div className="scanner-demo__link-block">
              <a
                href="#"
                onClick={showError}
                onKeyDown={onUnsafeKeyDown}
                className="scanner-demo__link"
                aria-label="Unprotected link (preview bot blocked)"
              >
                Sign in to Example
              </a>
              <span className="scanner-demo__domain">app.example.com</span>
            </div>
            <div className="scanner-demo__link-block">
              <a
                href="#"
                onClick={showSuccess}
                onKeyDown={onSafeKeyDown}
                className="scanner-demo__link"
                aria-label="Protected link (opened by human)"
              >
                Sign in to Example
              </a>
              <span className="scanner-demo__domain">go.example.com</span>
            </div>
          </div>
          <div className="scanner-demo__output" aria-live="polite">
            {result === null && (
              <div className="scanner-demo__result scanner-demo__result--idle">
                <span>Click a link above to see the result.</span>
              </div>
            )}
            {result?.kind === "error" && (
              <div className="scanner-demo__result scanner-demo__result--error">
                <X className="scanner-demo__result-icon" aria-hidden />
                <span>{result.title}: {result.detail}</span>
              </div>
            )}
            {result?.kind === "success" && (
              <div className="scanner-demo__result scanner-demo__result--success">
                <Check className="scanner-demo__result-icon" aria-hidden />
                <span>{result.title}: {result.detail}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
