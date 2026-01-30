import type { Metadata } from "next";
import Link from "next/link";
import LinkGenerator from "./LinkGenerator";

export const metadata: Metadata = {
  title: "Start free — Auth Link Rail",
  description: "Allow your destinations, generate protected links, paste into Supabase templates.",
};

export default function StartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold text-slate-900">Start free</h1>
      <p className="mt-2 text-slate-600">
        Three steps: allow your destinations, generate a protected link, then paste into your
        email templates.
      </p>

      {/* 1) Allow your destinations */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">
          1) Allow your destinations
        </h2>
        <p className="mt-2 text-slate-600">
          Set these in your worker config (e.g. wrangler.toml or Secrets). The rail only
          redirects to hosts you allow.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Exact hosts (comma-separated)</p>
            <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
              {`ALLOWED_DEST_HOSTS="YOURPROJECT.supabase.co,app.yourdomain.com"`}
            </pre>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              Optional: host suffixes (e.g. all Supabase projects)
            </p>
            <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
              {`ALLOWED_DEST_HOST_SUFFIXES=".supabase.co"`}
            </pre>
          </div>
        </div>
      </section>

      {/* 2) Generate your protected link */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">
          2) Generate your protected link
        </h2>
        <p className="mt-2 text-slate-600">
          Enter the destination URL (e.g. your Supabase confirmation URL). We&apos;ll output a
          protected link and a snippet you can use server-side.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          <strong>Testing without Supabase?</strong> Create a test destination (e.g. app.suqram.com),
          add it to your allowlist, then generate a link to it and click through to confirm the
          flow works.
        </p>
        <div className="mt-4">
          <LinkGenerator />
        </div>
      </section>

      {/* 3) Paste into Supabase templates */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">
          3) Paste into Supabase templates
        </h2>
        <p className="mt-2 text-slate-600">
          Use the same pattern for Magic Link, Invite, and Password Reset: build the rail link
          server-side (with the snippet above) and put it in the email body instead of the raw
          confirmation URL.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-slate-600">
          <li>
            <strong>Magic Link</strong> — use rail link in place of{" "}
            <code className="rounded bg-slate-200 px-1">{`{{ .ConfirmationURL }}`}</code>
          </li>
          <li>
            <strong>Invite</strong> — wrap your invite URL in the rail link format
          </li>
          <li>
            <strong>Password Reset</strong> — use rail link in place of the default reset URL
          </li>
        </ul>
        <p className="mt-4">
          <Link
            href="/docs"
            className="text-sm font-medium text-sky-600 hover:text-sky-700"
          >
            Full Supabase snippets and setup →
          </Link>
        </p>
        <p className="mt-2">
          <Link
            href="/live-test"
            className="text-sm font-medium text-sky-600 hover:text-sky-700"
          >
            Run a real inbox test →
          </Link>
        </p>
      </section>
    </div>
  );
}
