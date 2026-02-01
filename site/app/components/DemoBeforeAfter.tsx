"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

type Mode = "unprotected" | "protected";
type Phase = "idle" | "sweeping" | "done";

const BEAT_MS = 600;

export default function DemoBeforeAfter() {
  const [mode, setMode] = useState<Mode>("unprotected");
  const [phase, setPhase] = useState<Phase>("idle");
  const [clickedUnprotected, setClickedUnprotected] = useState(false);
  const [clickedProtected, setClickedProtected] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduceMotion = useReducedMotion() ?? false;

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const runSimulation = useCallback(() => {
    clearAllTimeouts();
    setClickedUnprotected(false);
    setClickedProtected(false);
    setPhase("sweeping");

    const t = setTimeout(() => setPhase("done"), BEAT_MS);
    timeoutsRef.current.push(t);
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
    window.addEventListener("hashchange", focusSimulate);
    return () => window.removeEventListener("hashchange", focusSimulate);
  }, []);

  const burned = phase === "done";
  const stillValid = phase === "done";

  return (
    <div className="w-full">
      <Tabs value={mode} onValueChange={(v) => onToggle(v as Mode)} className="w-full">
        <TabsList className="mb-4 w-full sm:w-auto h-10">
          <TabsTrigger value="unprotected" className="flex-1 sm:flex-none px-4">
            Unprotected
          </TabsTrigger>
          <TabsTrigger value="protected" className="flex-1 sm:flex-none px-4">
            Protected
          </TabsTrigger>
        </TabsList>

        <div
          className={cn(
            "rounded-xl border border-[var(--border)] p-6 sm:p-8 shadow-[var(--shadow-soft)]",
            "bg-[rgba(255,255,255,0.8)] backdrop-blur-sm"
          )}
        >
          <p className="text-sm text-[var(--muted)] mb-6">Your sign-in link is ready.</p>

          <div className="relative space-y-6">
            {phase === "sweeping" ? (
              <motion.div
                className="absolute inset-0 rounded-xl bg-[var(--accent-soft)]/60 pointer-events-none z-0"
                initial={reduceMotion ? {} : { opacity: 0 }}
                animate={reduceMotion ? {} : { opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                aria-hidden
              />
            ) : null}
            <div className="relative z-10 space-y-6">
              {/* Unprotected link */}
              <div className="space-y-1">
                <motion.a
                  href="#"
                  onClick={onUnprotectedClick}
                  className={cn(
                    "text-base font-medium text-[var(--accent)] underline-offset-4 hover:underline inline-block transition-[text-decoration,opacity] duration-150",
                    burned ? "opacity-55 line-through decoration-[var(--danger-border)]" : ""
                  )}
                  aria-label={phase === "done" ? "Unprotected link" : "Link"}
                  whileHover={reduceMotion ? {} : { textDecoration: "underline" }}
                  transition={{ duration: 0.15 }}
                >
                  Sign in to Example
                </motion.a>
                <p
                  className={cn(
                    "font-mono text-xs text-[var(--muted)] break-all",
                    burned ? "opacity-50" : ""
                  )}
                >
                  https://app.example.com/auth/verify?token=•••••••••
                </p>
                {burned ? (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5 mt-2"
                  >
                    <Badge
                      variant="destructive"
                      className="text-[11px] px-2 py-0.5 gap-1 font-normal border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]"
                    >
                      <X className="h-3 w-3" aria-hidden />
                      Expired
                    </Badge>
                  </motion.div>
                ) : null}
                {phase === "done" && clickedUnprotected ? (
                  <p className="text-xs text-[var(--danger-text)] mt-1.5" aria-live="polite">
                    Expired.
                  </p>
                ) : null}
              </div>

              {/* Protected link */}
              <div className="space-y-1">
                <motion.a
                  href="#"
                  onClick={onProtectedClick}
                  className="text-base font-medium text-[var(--accent)] underline-offset-4 hover:underline inline-block transition-[text-decoration] duration-150"
                  aria-label={phase === "done" ? "Protected link" : "Link"}
                  whileHover={reduceMotion ? {} : { textDecoration: "underline" }}
                  transition={{ duration: 0.15 }}
                >
                  Sign in to Example
                </motion.a>
                <p className="font-mono text-xs text-[var(--muted)] break-all">
                  https://go.example.com/r/•••••••
                </p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  Uses your link domain (CNAME). End-users never see suqram.com.
                </p>
                {stillValid ? (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5 mt-2"
                  >
                    <Badge
                      variant="secondary"
                      className="text-[11px] px-2 py-0.5 gap-1 font-normal border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]"
                    >
                      <Check className="h-3 w-3" aria-hidden />
                      Still valid
                    </Badge>
                  </motion.div>
                ) : null}
                {phase === "done" && clickedProtected ? (
                  <p className="text-xs text-[var(--success-text)] mt-1.5" aria-live="polite">
                    Signed in.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <Button
            id="demo-simulate"
            variant="outline"
            className="mt-6 h-10 px-5"
            onClick={runSimulation}
            disabled={phase !== "idle" && phase !== "done" ? true : false}
            aria-label="Simulate scanner pre-open"
          >
            Simulate scanner pre-open
          </Button>
        </div>
      </Tabs>
    </div>
  );
}
