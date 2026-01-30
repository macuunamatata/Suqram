import type { Metadata } from "next";
import { REPO_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Docs — Auth Link Rail",
  description: "Quickstart: local run and Supabase integration in minutes.",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold text-slate-900">Docs</h1>
      <p className="mt-2 text-slate-600">
        Get the rail running locally or with Supabase in under 15 minutes.
      </p>

      <section id="quickstart" className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">Quickstart</h2>

        <h3 className="mt-6 text-base font-semibold text-slate-800">Local (5 minutes)</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
{`npm install
wrangler d1 execute EIG_DB --file=sql/schema.sql --local --config ./wrangler.toml
npm run dev`}
        </pre>
        <p className="mt-2 text-sm text-slate-600">
          Then in another terminal: <code className="rounded bg-slate-200 px-1">npm run smoke</code> to
          verify.
        </p>

        <h3 className="mt-8 text-base font-semibold text-slate-800">Supabase (15 minutes)</h3>
        <ol className="mt-2 list-decimal space-y-3 pl-5 text-slate-600">
          <li>Deploy the worker and point your rail domain (e.g. <code className="rounded bg-slate-200 px-1">links.yourdomain.com</code>) to it.</li>
          <li>Set allowed destination hosts so the rail can redirect to your Supabase project and app (e.g. <code className="rounded bg-slate-200 px-1">ALLOWED_DEST_HOSTS=yourproject.supabase.co,yourapp.com</code> or <code className="rounded bg-slate-200 px-1">ALLOWED_DEST_HOST_SUFFIXES=.supabase.co</code>).</li>
          <li>In your email flow, build the rail link instead of the raw confirmation URL: unique <code className="rounded bg-slate-200 px-1">rid</code> + fragment <code className="rounded bg-slate-200 px-1">#u=</code> + <code className="rounded bg-slate-200 px-1">encodeURIComponent(confirmationUrl)</code>. Use that link in the email body.</li>
        </ol>
        <p className="mt-4 text-sm text-slate-600">
          Example (Node): <code className="block mt-1 rounded bg-slate-100 p-2 text-xs">const railLink = `https://links.yourdomain.com/r/${"${rid}"}#u=${"${encodeURIComponent(destination)}"}`;</code>
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">Deploy this site (suqram.com)</h2>
        <p className="mt-2 text-slate-600">
          Cloudflare Pages: root directory <code className="rounded bg-slate-200 px-1">site</code>, build
          command <code className="rounded bg-slate-200 px-1">npm run build</code>, output directory{" "}
          <code className="rounded bg-slate-200 px-1">out</code>. Add custom domain suqram.com. Full steps in{" "}
          <code className="rounded bg-slate-200 px-1">site/README.md</code>.
        </p>
      </section>

      <section className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Full documentation</h2>
        <p className="mt-2 text-slate-600">
          Setup, allowed hosts, Supabase templates (Magic Link, Invite, Password Reset),
          troubleshooting, and demo mode are in the GitHub README.
        </p>
        <a
          href={`${REPO_URL}#readme`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          Open full docs on GitHub →
        </a>
      </section>
    </div>
  );
}
