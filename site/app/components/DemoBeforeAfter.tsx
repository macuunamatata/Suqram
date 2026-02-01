"use client";

import { useState, useRef, useCallback } from "react";
import { X, Check } from "lucide-react";

const DEMO_CREATE_URL = "https://go.suqram.com/demo/create";
const DEMO_SCAN_URL = "https://go.suqram.com/demo/scan";

type Session = {
  tid: string;
  unprotected_url: string;
  protected_url: string;
};

type Result = "idle" | "loading" | "expired" | "signedin";

export default function DemoBeforeAfter() {
  const [session, setSession] = useState<Session | null>(null);
  const [resultUnprotected, setResultUnprotected] = useState<Result>("idle");
  const [resultProtected, setResultProtected] = useState<Result>("idle");
  const runIdRef = useRef(0);

  const runUnprotectedClick = useCallback(async () => {
    const currentRunId = runIdRef.current + 1;
    runIdRef.current = currentRunId;
    setResultProtected("idle");
    setResultUnprotected("loading");

    try {
      let tid: string;
      let unprotectedUrl: string;
      let protectedUrl: string;

      if (session !== null) {
        tid = session.tid;
        unprotectedUrl = session.unprotected_url;
        protectedUrl = session.protected_url;
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
          if (currentRunId !== runIdRef.current) return;
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
          if (currentRunId !== runIdRef.current) return;
          setResultUnprotected("idle");
          return;
        }
        setSession({ tid, unprotected_url: unprotectedUrl, protected_url: protectedUrl });
      }

      await fetch(unprotectedUrl, { method: "GET", redirect: "follow" });
      if (currentRunId !== runIdRef.current) return;
      setResultUnprotected("expired");
    } catch {
      if (currentRunId !== runIdRef.current) return;
      setResultUnprotected("idle");
    }
  }, [session]);

  const runProtectedClick = useCallback(async () => {
    const currentRunId = runIdRef.current + 1;
    runIdRef.current = currentRunId;
    setResultUnprotected("idle");
    setResultProtected("loading");

    try {
      let tid: string;
      let unprotectedUrl: string;
      let protectedUrl: string;

      if (session !== null) {
        tid = session.tid;
        unprotectedUrl = session.unprotected_url;
        protectedUrl = session.protected_url;
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
          if (currentRunId !== runIdRef.current) return;
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
          if (currentRunId !== runIdRef.current) return;
          setResultProtected("idle");
          return;
        }
        setSession({ tid, unprotected_url: unprotectedUrl, protected_url: protectedUrl });
      }

      await fetch(protectedUrl, { method: "GET", redirect: "follow" });
      if (currentRunId !== runIdRef.current) return;
      setResultProtected("signedin");
    } catch {
      if (currentRunId !== runIdRef.current) return;
      setResultProtected("idle");
    }
  }, [session]);

  const onUnprotectedClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (resultUnprotected === "loading") return;
      runUnprotectedClick();
    },
    [resultUnprotected, runUnprotectedClick]
  );

  const onProtectedClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (resultProtected === "loading") return;
      runProtectedClick();
    },
    [resultProtected, runProtectedClick]
  );

  return (
    <div className="demo-links-only">
      <div className="demo-link-block">
        <p className="demo-link-caption">Unprotected</p>
        <a
          href="#"
          onClick={onUnprotectedClick}
          className="demo-link-email"
          aria-label="Unprotected sign-in link"
        >
          Sign in to Example
        </a>
        <p className="demo-link-domain" aria-hidden>
          app.example.com
        </p>
        {resultUnprotected === "loading" ? (
          <p className="demo-link-result demo-link-result-loading" aria-live="polite">
            …
          </p>
        ) : resultUnprotected === "expired" ? (
          <p className="demo-link-result demo-link-result-expired" aria-live="polite">
            <X className="demo-link-result-icon" aria-hidden />
            Link expired
          </p>
        ) : null}
      </div>

      <div className="demo-link-block">
        <p className="demo-link-caption">Protected (your domain)</p>
        <a
          href="#"
          onClick={onProtectedClick}
          className="demo-link-email"
          aria-label="Protected sign-in link"
        >
          Sign in to Example
        </a>
        <p className="demo-link-domain" aria-hidden>
          go.example.com
        </p>
        {resultProtected === "loading" ? (
          <p className="demo-link-result demo-link-result-loading" aria-live="polite">
            …
          </p>
        ) : resultProtected === "signedin" ? (
          <p className="demo-link-result demo-link-result-signedin" aria-live="polite">
            <Check className="demo-link-result-icon" aria-hidden />
            Signed in
          </p>
        ) : null}
      </div>
    </div>
  );
}
