import type { Metadata } from "next";
import Link from "next/link";
import LinkGenerator from "./LinkGenerator";

export const metadata: Metadata = {
  title: "Start free — Auth Link Rail",
  description: "Allow your destinations, generate protected links, paste into Supabase templates.",
};

export default function StartPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">Start free</h1>
        <p className="mt-3 text-[var(--muted)]">
          Three steps: allow your destinations, generate a protected link, then paste into your
          email templates.
        </p>

        {/* 1) Allow your destinations */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-[var(--text)]">
            1) Allow your destinations
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            Set these in your worker config (e.g. wrangler.toml or Secrets). The rail only
            redirects to hosts you allow.
          </p>
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Exact hosts (comma-separated)</p>
              <pre className="input-base mt-2 overflow-x-auto p-4 font-mono text-sm">
                {`ALLOWED_DEST_HOSTS="YOURPROJECT.supabase.co,app.yourdomain.com"`}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text)]">
                Optional: host suffixes (e.g. all Supabase projects)
              </p>
              <pre className="input-base mt-2 overflow-x-auto p-4 font-mono text-sm">
                {`ALLOWED_DEST_HOST_SUFFIXES=".supabase.co"`}
              </pre>
            </div>
          </div>
        </section>

        {/* 2) Generate your protected link */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-[var(--text)]">
            2) Generate your protected link
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            Enter the destination URL (e.g. your Supabase confirmation URL). We&apos;ll output a
            protected link and a snippet you can use server-side.
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            <strong className="text-[var(--text)]">Testing without Supabase?</strong> Create a test destination (e.g. app.suqram.com),
            add it to your allowlist, then generate a link to it and click through to confirm the
            flow works.
          </p>
          <div className="mt-6">
            <LinkGenerator />
          </div>
        </section>

        {/* 3) Paste into Supabase templates */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-[var(--text)]">
            3) Paste into Supabase templates
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            Use the same pattern for Magic Link, Invite, and Password Reset: build the rail link
            server-side (with the snippet above) and put it in the email body instead of the raw
            confirmation URL.
          </p>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-[var(--muted)]">
            <li>
              <strong className="text-[var(--text)]">Magic Link</strong> — use rail link in place of{" "}
              <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)]">{`{{ .ConfirmationURL }}`}</code>
            </li>
            <li>
              <strong className="text-[var(--text)]">Invite</strong> — wrap your invite URL in the rail link format
            </li>
            <li>
              <strong className="text-[var(--text)]">Password Reset</strong> — use rail link in place of the default reset URL
            </li>
          </ul>
          <p className="mt-6">
            <Link href="/docs" className="link-accent text-sm">
              Full Supabase snippets and setup →
            </Link>
          </p>
          <p className="mt-3">
            <Link href="/live-test" className="link-accent text-sm">
              Run a real inbox test →
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
