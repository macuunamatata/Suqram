"use client";

import Link from "next/link";
import { signOut } from "@/app/actions/auth";

export function ApiKeysHeader() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          API keys
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Use an API key for programmatic access (Admin API, receipts).
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/app" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
          Dashboard
        </Link>
        <form action={signOut} className="inline">
          <button
            type="submit"
            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
