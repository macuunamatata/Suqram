"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ProtectedContent() {
  const searchParams = useSearchParams();
  const tid = searchParams.get("tid") ?? "";
  const ts = new Date().toISOString();

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-20 text-center">
      <div className="card card-gradient-top mx-auto max-w-xl border-[var(--accent)]/30 p-10 shadow-[0_0_32px_-8px_rgba(34,211,238,0.15)]">
        <h1 className="text-2xl font-bold text-[var(--text)] sm:text-3xl">
          Protected link worked
        </h1>
        <p className="mt-4 text-[var(--muted)]">
          You landed here after one click. Scanners did not consume this link.
        </p>
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

export default function TestProtectedPage() {
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
      <ProtectedContent />
    </Suspense>
  );
}
