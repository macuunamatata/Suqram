"use client";

import { useState, useRef, useCallback } from "react";
import { Check, ShieldAlert } from "lucide-react";

const DEMO_CREATE_URL = "https://go.suqram.com/demo/create";
const DEMO_SCAN_URL = "https://go.suqram.com/demo/scan";

type Session = {
  tid: string;
  unprotected_url: string;
  protected_url: string;
};

type Result = "idle" | "loading" | "expired" | "signedin";

export default function ScannerDemo() {
  const [session, setSession] = useState<Session | null>(null);
  const [resultUnprotected, setResultUnprotected] = useState<Result>("idle");
  const [resultProtected, setResultProtected] = useState<Result>("idle");
  const runIdRef = useRef(0);

  const runUnprotected = useCallback(async () => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setResultProtected("idle");
    setResultUnprotected("loading");
    try {
      let tid: string;
      let unprotectedUrl: string;
      let protectedUrl: string;
      if (session) {
        ({ tid, unprotected_url: unprotectedUrl, protected_url: protectedUrl } = session);
      } else {
        const createRes = await fetch(DEMO_CREATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const createJson = (await createRes.json().catch(() => ({}))) as {
          ok?: boolean;
          tid?: string;
          unprotected_url?: string;
          protected_url?: string;
        };
        if (!createRes.ok || !createJson?.ok || !createJson.tid) {
          if (runId !== runIdRef.current) return;
          setResultUnprotected("idle");
          return;
        }
        tid = createJson.tid;
        unprotectedUrl = createJson.unprotected_url ?? "";
        protectedUrl = createJson.protected_url ?? "";
        const scanRes = await fetch(DEMO_SCAN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tid }),
        });
        if (!scanRes.ok) {
          if (runId !== runIdRef.current) return;
          setResultUnprotected("idle");
          return;
        }
        setSession({ tid, unprotected_url: unprotectedUrl, protected_url: protectedUrl });
      }
      await fetch(unprotectedUrl, { method: "GET", redirect: "follow" });
      if (runId !== runIdRef.current) return;
      setResultUnprotected("expired");
    } catch {
      if (runId !== runIdRef.current) return;
      setResultUnprotected("idle");
    }
  }, [session]);

  const runProtected = useCallback(async () => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setResultUnprotected("idle");
    setResultProtected("loading");
    try {
      let tid: string;
      let unprotectedUrl: string;
      let protectedUrl: string;
      if (session) {
        ({ tid, unprotected_url: unprotectedUrl, protected_url: protectedUrl } = session);
      } else {
        const createRes = await fetch(DEMO_CREATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const createJson = (await createRes.json().catch(() => ({}))) as {
          ok?: boolean;
          tid?: string;
          unprotected_url?: string;
          protected_url?: string;
        };
        if (!createRes.ok || !createJson?.ok || !createJson.tid) {
          if (runId !== runIdRef.current) return;
          setResultProtected("idle");
          return;
        }
        tid = createJson.tid;
        unprotectedUrl = createJson.unprotected_url ?? "";
        protectedUrl = createJson.protected_url ?? "";
        const scanRes = await fetch(DEMO_SCAN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tid }),
        });
        if (!scanRes.ok) {
          if (runId !== runIdRef.current) return;
          setResultProtected("idle");
          return;
        }
        setSession({ tid, unprotected_url: unprotectedUrl, protected_url: protectedUrl });
      }
      await fetch(protectedUrl, { method: "GET", redirect: "follow" });
      if (runId !== runIdRef.current) return;
      setResultProtected("signedin");
    } catch {
      if (runId !== runIdRef.current) return;
      setResultProtected("idle");
    }
  }, [session]);

  const onUnsafe = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (resultUnprotected === "loading") return;
      runUnprotected();
    },
    [resultUnprotected, runUnprotected]
  );

  const onSafe = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (resultProtected === "loading") return;
      runProtected();
    },
    [resultProtected, runProtected]
  );

  const activeLink = resultUnprotected === "loading" ? "unsafe" : resultProtected === "loading" ? "safe" : null;

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
                onClick={onUnsafe}
                className={`scanner-demo__link ${activeLink === "unsafe" ? "scanner-demo__link--active" : ""}`}
                aria-label="Unprotected link"
              >
                Sign in to Example
              </a>
              <span className="scanner-demo__domain">app.example.com</span>
            </div>
            <div className="scanner-demo__link-block">
              <a
                href="#"
                onClick={onSafe}
                className={`scanner-demo__link ${activeLink === "safe" ? "scanner-demo__link--active" : ""}`}
                aria-label="Protected link"
              >
                Sign in to Example
              </a>
              <span className="scanner-demo__domain">go.example.com</span>
            </div>
          </div>
          <div className="scanner-demo__output" aria-live="polite">
            {resultUnprotected === "expired" && (
              <div className="scanner-demo__result scanner-demo__result--error">
                <ShieldAlert className="scanner-demo__result-icon" aria-hidden />
                <span>Link expired. Preview consumed the token.</span>
              </div>
            )}
            {resultProtected === "signedin" && (
              <div className="scanner-demo__result scanner-demo__result--success">
                <Check className="scanner-demo__result-icon" aria-hidden />
                <span>Signed in. Only a real click redeemed the link.</span>
              </div>
            )}
            {resultUnprotected !== "expired" && resultProtected !== "signedin" && (
              <div className="scanner-demo__result scanner-demo__result--idle">
                <span>Click a link above to see the result.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
