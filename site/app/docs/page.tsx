import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL } from "@/lib/constants";

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Docs — Auth Link Rail",
  description: "Quickstart: local run and setup guides (Supabase, Auth0, Clerk, and more) in minutes.",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">Docs</h1>
        <p className="mt-3 text-[var(--muted)]">
          Get the rail running locally or follow a setup guide for your stack in under 15 minutes.
        </p>

        <p className="mt-6">
          <Link href="/docs/setup" className="link-accent text-sm">
            Setup guides →
          </Link>
        </p>

        <section id="quickstart" className="mt-14">
          <h2 className="text-xl font-semibold text-[var(--text)]">Quickstart</h2>

          <h3 className="mt-8 text-base font-semibold text-[var(--text)]">Local (5 minutes)</h3>
          <pre className="input-base mt-3 overflow-x-auto p-4 font-mono text-sm">
{`npm install
wrangler d1 execute EIG_DB --file=sql/schema.sql --local --config ./wrangler.toml
npm run dev`}
          </pre>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Then in another terminal: <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)]">npm run smoke</code> to verify.
          </p>

          <h3 className="mt-8 text-base font-semibold text-[var(--text)]">Connect your auth (15 minutes)</h3>
          <p className="mt-3 text-sm text-[var(--muted)]">
            See <Link href="/docs/setup" className="text-[var(--accent)] hover:underline">Setup guides</Link> for step-by-step instructions: Supabase, Auth0, Clerk, NextAuth, Firebase, or custom. Deploy the worker, set allowed destination hosts, then build the rail link in your email flow (unique <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)]">rid</code> + <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)]">#u=</code> + <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)]">encodeURIComponent(destination)</code>).
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold text-[var(--text)]">Deploy this site (suqram.com)</h2>
          <p className="mt-3 text-[var(--muted)]">
            Cloudflare Pages: root directory <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)]">site</code>, build
            command <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)]">npm run build</code>, output directory{" "}
            <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)]">out</code>. Add custom domain suqram.com. Full steps in{" "}
            <code className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--accent)]">site/README.md</code>.
          </p>
        </section>

        <section className="mt-14">
          <div className="card card-gradient-top p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Full documentation</h2>
            <p className="mt-3 text-[var(--muted)]">
              Setup, allowed hosts, email templates (Magic Link, Invite, Password Reset),
              troubleshooting, and demo mode are in the GitHub README.
            </p>
            <a
              href={`${REPO_URL}#readme`}
              target="_blank"
              rel="noopener noreferrer"
              className="link-accent mt-4 inline-flex text-sm"
            >
              Open full docs on GitHub →
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
