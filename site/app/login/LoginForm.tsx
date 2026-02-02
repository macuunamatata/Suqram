"use client";

import { signIn, signUp } from "@/app/actions/auth";
import { useSearchParams } from "next/navigation";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="mt-10 space-y-8">
      <form
        action={async (fd: FormData) => {
          fd.set("redirectTo", redirectTo);
          await signIn(fd);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--text)]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input-base mt-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--text)]">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-base mt-1 w-full"
          />
        </div>
        <button type="submit" className="btn-hero w-full">
          Sign in
        </button>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[var(--bg)] px-2 text-[var(--muted)]">or</span>
        </div>
      </div>
      <form
        action={async (fd: FormData) => {
          fd.set("redirectTo", redirectTo);
          await signUp(fd);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium text-[var(--text)]">
            Email (new account)
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input-base mt-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium text-[var(--text)]">
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="input-base mt-1 w-full"
          />
        </div>
        <button type="submit" className="btn-hero w-full border-[var(--border)]">
          Sign up
        </button>
      </form>
      {error && (
        <p className="text-sm text-[var(--error-muted)]" role="alert">
          {error === "missing"
            ? "Email and password are required."
            : decodeURIComponent(error)}
        </p>
      )}
    </div>
  );
}
