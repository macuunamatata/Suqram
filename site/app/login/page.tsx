import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export const metadata: Metadata = {
  title: "Log in — Suqram",
  description: "Sign in with Google to manage your link rail and create protected links.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await auth();
  const { returnTo } = await searchParams;
  const callbackUrl = returnTo && returnTo.startsWith("/") ? returnTo : "/app";

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
      <div className="w-full">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          Log in
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Sign in with Google to manage your link rail, create your first site, and generate protected links for auth or transactional emails.
        </p>

        <form
          action={async (formData: FormData) => {
            "use server";
            const to = (formData.get("callbackUrl") as string) || "/app";
            await signIn("google", { redirectTo: to });
          }}
          className="mt-10"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button
            type="submit"
            className="btn-hero w-full"
          >
            Continue with Google
          </button>
        </form>

        <p className="mt-8">
          <Link
            href="/start?mode=signin"
            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
          >
            Advanced: use an API key
          </Link>
        </p>
      </div>
    </div>
  );
}
