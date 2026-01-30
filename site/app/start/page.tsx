import type { Metadata } from "next";
import Link from "next/link";
import LinkGenerator from "./LinkGenerator";

export const metadata: Metadata = {
  title: "Integrate — Auth Link Rail",
  description: "Generate protected links and paste into Supabase. Run the inbox test first.",
};

export default function StartPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          Integrate
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Run the inbox test first, then generate protected links and paste into your email provider.
        </p>

        {/* 1) Run the inbox test — primary */}
        <section className="mt-10 sm:mt-12">
          <div className="card card-gradient-top border-[var(--accent)]/20 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)]">
              Run the inbox test
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Send yourself a test email. Click both links to see the difference.
            </p>
            <Link
              href="/"
              className="btn-primary mt-6 inline-flex w-full justify-center sm:w-auto"
            >
              Send test email
            </Link>
          </div>
        </section>

        {/* 2) Generate your protected link */}
        <section className="mt-10 sm:mt-12">
          <h2 className="text-xl font-semibold text-[var(--text)]">
            Generate your protected link
          </h2>
          <p className="mt-2 text-[var(--muted)]">
            Paste your existing destination URL. We&apos;ll output the protected link you put in the email.
          </p>
          <div className="mt-6">
            <LinkGenerator />
          </div>
        </section>

        {/* 3) Allow destinations — advanced in details */}
        <section className="mt-10 sm:mt-12">
          <div className="card card-gradient-top p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)]">
              Allow where links are allowed to go
            </h2>
            <p className="mt-3 text-[var(--muted)]">
              Only these domains can be destinations. Example: your Supabase project host + your app domain.
            </p>
            <details className="mt-6 group">
              <summary className="cursor-pointer list-none text-sm font-medium text-[var(--accent)] hover:underline">
                Advanced settings
              </summary>
              <div className="mt-4 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
                <div>
                  <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Exact hosts (comma-separated)</p>
                  <pre className="input-base mt-1.5 overflow-x-auto p-3 font-mono text-xs">
                    {`ALLOWED_DEST_HOSTS="YOURPROJECT.supabase.co,app.yourdomain.com"`}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Optional: host suffixes</p>
                  <pre className="input-base mt-1.5 overflow-x-auto p-3 font-mono text-xs">
                    {`ALLOWED_DEST_HOST_SUFFIXES=".supabase.co"`}
                  </pre>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Set these where you run the link service (e.g. Cloudflare Worker secrets or config).
                </p>
              </div>
            </details>
          </div>
        </section>

        {/* 4) Paste into Supabase */}
        <section className="mt-10 sm:mt-12">
          <div className="card card-gradient-top p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)]">
              Paste into Supabase email templates
            </h2>
            <p className="mt-3 text-[var(--muted)]">
              In Supabase Auth → Email Templates, replace the default link with your protected link.
            </p>
            <ul className="mt-4 space-y-2 text-[var(--muted)]">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                <span><strong className="text-[var(--text)]">Magic Link</strong> — replace the confirmation URL with your protected link.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                <span><strong className="text-[var(--text)]">Invite</strong> — use your protected link instead of the raw invite URL.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                <span><strong className="text-[var(--text)]">Password Reset</strong> — replace the default reset URL with your protected link.</span>
              </li>
            </ul>
            <p className="mt-6">
              <Link href="/docs" className="link-accent text-sm">
                Full Supabase setup →
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
