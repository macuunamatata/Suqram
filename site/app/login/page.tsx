import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Log in — Suqram",
  description: "Sign in with Google to manage your link rail and create protected links.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
      <div className="w-full">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          Log in
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Login is temporarily disabled on this deployment.
        </p>
        <p className="mt-6">
          <Link
            href="/"
            className="text-sm text-[var(--accent)] transition-colors hover:underline"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
