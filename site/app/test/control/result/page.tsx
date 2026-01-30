"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResultContent() {
  const searchParams = useSearchParams();
  const used = searchParams.get("used") === "1";
  const tid = searchParams.get("tid") ?? "";
  const ts = new Date().toISOString();

  const hasUsed = searchParams.has("used");
  const headline = hasUsed
    ? used
      ? "Control link was already used."
      : "Control link worked (first click)."
    : "Result ready.";
  const subtext = hasUsed
    ? used
      ? "This link was already used — likely by an email scanner before you clicked."
      : "You were the first to click this link. In a corporate inbox, scanners often hit it first."
    : "Open this page from the control link in your test email to see the outcome.";

  const isUsed = hasUsed && used;

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-20 text-center">
      <div
        className={`card card-gradient-top mx-auto max-w-xl p-10 ${
          isUsed
            ? "border-amber-500/30 shadow-[0_0_24px_-8px_rgba(245,158,11,0.15)]"
            : "border-[var(--accent)]/30 shadow-[0_0_32px_-8px_rgba(34,211,238,0.15)]"
        }`}
      >
        <h1
          className={`text-2xl font-bold sm:text-3xl ${
            isUsed ? "text-amber-400" : "text-[var(--text)]"
          }`}
        >
          {headline}
        </h1>
        <p className="mt-4 text-[var(--muted)]">{subtext}</p>
        <p className="mt-6 text-sm text-[var(--muted)]">
          {ts}
          {tid ? ` · Test ID: ${tid}` : ""}
        </p>
      </div>
      <p className="mt-10">
        <a href="/live-test" className="link-accent">
          Run another live inbox test →
        </a>
      </p>
    </div>
  );
}

export default function TestControlResultPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1120px] px-4 py-20 text-center">
          <div className="card mx-auto max-w-xl p-10">
            <p className="text-[var(--muted)]">Loading…</p>
          </div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
