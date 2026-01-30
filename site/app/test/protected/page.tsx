"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ProtectedContent() {
  const searchParams = useSearchParams();
  const tid = searchParams.get("tid") ?? "";
  const ts = new Date().toISOString();

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-10">
        <h1 className="text-2xl font-bold text-green-800 sm:text-3xl">
          Protected link worked
        </h1>
        <p className="mt-4 text-slate-600">
          You landed here after one click. Scanners did not consume this link.
        </p>
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

export default function TestProtectedPage() {
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
      <ProtectedContent />
    </Suspense>
  );
}
