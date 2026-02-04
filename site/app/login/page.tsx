import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Log in — Suqram",
  description:
    "Sign in with email to manage your link rail and create protected links.",
};

const hasSupabaseEnv =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const redirectTo =
    nextParam && nextParam.startsWith("/") ? nextParam : "/app";

  if (!hasSupabaseEnv) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
        <div className="w-full">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
            Log in
          </h1>
          <p className="mt-3 text-[var(--error-muted)]" role="alert">
            Login is not configured: missing <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> or <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Set them in your environment to enable sign-in.
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(redirectTo);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
      <div className="w-full">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          Log in
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Sign in with email to manage your link rail and create protected
          links.
        </p>
        <LoginForm redirectTo={redirectTo} />
        <p className="mt-8">
          <Link
            href="/"
            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
