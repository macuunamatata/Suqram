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

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div
        className={`rounded-2xl border-2 p-10 ${
          hasUsed && used
            ? "border-amber-300 bg-amber-50"
            : "border-green-300 bg-green-50"
        }`}
      >
        <h1
          className={`text-2xl font-bold sm:text-3xl ${
            hasUsed && used ? "text-amber-800" : "text-green-800"
          }`}
        >
          {headline}
        </h1>
        <p className="mt-4 text-slate-600">{subtext}</p>
        <p className="mt-6 text-sm text-slate-500">
          {ts}
          {tid ? ` · Test ID: ${tid}` : ""}
        </p>
      </div>
      <p className="mt-8">
        <a href="/live-test" className="text-sky-600 hover:text-sky-700">
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
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-10">
            <p className="text-slate-600">Loading…</p>
          </div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
