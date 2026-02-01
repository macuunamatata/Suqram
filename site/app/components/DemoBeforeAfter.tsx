"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

type Mode = "unprotected" | "protected";
type Phase = "idle" | "sweeping" | "step1" | "step2" | "step3" | "done";

const BEAT_MS = 550;

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

    const t1 = setTimeout(() => setPhase("step1"), BEAT_MS);
    timeoutsRef.current.push(t1);
    const t2 = setTimeout(() => setPhase("step2"), BEAT_MS * 2);
    timeoutsRef.current.push(t2);
    const t3 = setTimeout(() => setPhase("step3"), BEAT_MS * 3);
    timeoutsRef.current.push(t3);
    const t4 = setTimeout(() => setPhase("done"), BEAT_MS * 4);
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

  const stepActive =
    phase === "sweeping" ? 1 : phase === "step1" ? 1 : phase === "step2" ? 2 : phase === "step3" ? 3 : phase === "done" ? 3 : 0;
  const showStep2Chip = stepActive >= 2;
  const showStep3Chip = stepActive >= 3;
  const burned = phase === "done";
  const stillValid = phase === "done";

  return (
    <div className="max-w-[560px] mx-auto">
      <Tabs value={mode} onValueChange={(v) => onToggle(v as Mode)} className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="unprotected" className="flex-1 sm:flex-none">Unprotected</TabsTrigger>
          <TabsTrigger value="protected" className="flex-1 sm:flex-none">Protected</TabsTrigger>
        </TabsList>
        <DemoContent
          phase={phase}
          burned={burned}
          stillValid={stillValid}
          clickedUnprotected={clickedUnprotected}
          clickedProtected={clickedProtected}
          onUnprotectedClick={onUnprotectedClick}
          onProtectedClick={onProtectedClick}
          onSimulate={runSimulation}
          stepActive={stepActive}
          showStep2Chip={showStep2Chip}
          showStep3Chip={showStep3Chip}
          mode={mode}
          reduceMotion={reduceMotion ?? false}
        />
      </Tabs>
    </div>
  );
}

function DemoContent({
  phase,
  burned,
  stillValid,
  clickedUnprotected,
  clickedProtected,
  onUnprotectedClick,
  onProtectedClick,
  onSimulate,
  stepActive,
  showStep2Chip,
  showStep3Chip,
  mode,
  reduceMotion,
}: {
  phase: Phase;
  burned: boolean;
  stillValid: boolean;
  clickedUnprotected: boolean;
  clickedProtected: boolean;
  onUnprotectedClick: (e: React.MouseEvent) => void;
  onProtectedClick: (e: React.MouseEvent) => void;
  onSimulate: () => void;
  stepActive: number;
  showStep2Chip: boolean;
  showStep3Chip: boolean;
  mode: Mode;
  reduceMotion: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground mb-4">Your sign-in link is ready.</p>

      {/* Rail: 3 steps */}
      <div className="relative flex flex-col gap-4 mb-6 pl-5">
        <div className="absolute left-0 top-2 bottom-2 w-px bg-border" aria-hidden />
        <div className="flex items-center gap-2 relative">
          <span
            className={cn(
              "absolute left-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full shrink-0",
              stepActive >= 1 ? "bg-primary ring-2 ring-primary/20" : "bg-muted"
            )}
          />
          <span className={cn("text-xs font-medium", stepActive >= 1 ? "text-foreground" : "text-muted-foreground")}>
            Scanner view
          </span>
        </div>
        <div className="flex items-center gap-2 relative">
          <span
            className={cn(
              "absolute left-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full shrink-0",
              stepActive >= 2 ? "bg-primary ring-2 ring-primary/20" : "bg-muted"
            )}
          />
          <span className={cn("text-xs font-medium", stepActive >= 2 ? "text-foreground" : "text-muted-foreground")}>
            Redeem attempt
          </span>
          {showStep2Chip ? (
            <Badge variant={mode === "unprotected" ? "destructive" : "secondary"} className="ml-auto text-[10px] px-1.5 py-0">
              {mode === "unprotected" ? "Consumed" : "Blocked"}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2 relative">
          <span
            className={cn(
              "absolute left-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full shrink-0",
              stepActive >= 3 ? "bg-primary ring-2 ring-primary/20" : "bg-muted"
            )}
          />
          <span className={cn("text-xs font-medium", stepActive >= 3 ? "text-foreground" : "text-muted-foreground")}>
            Interactive redemption
          </span>
          {showStep3Chip ? (
            <Badge variant={mode === "unprotected" ? "destructive" : "default"} className="ml-auto text-[10px] px-1.5 py-0">
              {mode === "unprotected" ? "Expired" : "Signed in"}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Links block with sweep */}
      <div className="relative space-y-5">
        {phase === "sweeping" && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-primary/5 pointer-events-none z-0"
            initial={reduceMotion ? {} : { opacity: 0 }}
            animate={reduceMotion ? {} : { opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            aria-hidden
          />
        )}
        <div className="relative z-10">
        {/* Unprotected link */}
        <div className="space-y-1">
          <motion.a
            href="#"
            onClick={onUnprotectedClick}
            className={cn(
              "text-base font-medium text-primary underline-offset-4 hover:underline inline-block",
              burned ? "opacity-60 line-through decoration-destructive" : ""
            )}
            aria-label={phase === "done" ? "Unprotected link" : "Link"}
            whileHover={reduceMotion ? {} : { textDecoration: "underline" }}
            transition={{ duration: 0.15 }}
          >
            Sign in to Example
          </motion.a>
          <p className={cn("font-mono text-xs text-muted-foreground", burned ? "opacity-50" : "")}>
            https://app.example.com/auth/verify?token=•••••••••
          </p>
          {burned ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 mt-1"
            >
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                <X className="h-2.5 w-2.5" aria-hidden />
                Expired
              </Badge>
            </motion.div>
          ) : null}
          {phase === "done" && clickedUnprotected ? (
            <p className="text-sm text-destructive mt-1" aria-live="polite">
              This link is expired.
            </p>
          ) : null}
        </div>

        {/* Protected link */}
        <div className="space-y-1">
          <motion.a
            href="#"
            onClick={onProtectedClick}
            className="text-base font-medium text-primary underline-offset-4 hover:underline inline-block"
            aria-label={phase === "done" ? "Protected link" : "Link"}
            whileHover={reduceMotion ? {} : { textDecoration: "underline" }}
            transition={{ duration: 0.15 }}
          >
            Sign in to Example
          </motion.a>
          <p className="font-mono text-xs text-muted-foreground">
            https://go.example.com/r/•••••••
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Uses your link domain (CNAME). End-users never see suqram.com.
          </p>
          {stillValid ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 mt-1"
            >
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                <Check className="h-2.5 w-2.5" aria-hidden />
                Still valid
              </Badge>
            </motion.div>
          ) : null}
          {phase === "done" && clickedProtected ? (
            <p className="text-sm text-green-700 dark:text-green-400 mt-1" aria-live="polite">
              Signed in.
            </p>
          ) : null}
        </div>
        </div>
      </div>

      <Button
        id="demo-simulate"
        variant="outline"
        className="mt-6"
        onClick={onSimulate}
        disabled={phase !== "idle" && phase !== "done"}
        aria-label="Simulate scanner pre-open"
      >
        Simulate scanner pre-open
      </Button>
    </div>
  );
}
