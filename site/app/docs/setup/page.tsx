import type { Metadata } from "next";
import Link from "next/link";

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Setup guides — Suqram",
  description: "Connect your link rail to Supabase, Auth0, Clerk, NextAuth, Firebase, or a custom stack.",
};

const GUIDES = [
  { slug: "supabase", label: "Supabase", href: "/docs/supabase", available: true },
  { slug: "auth0", label: "Auth0", href: "/docs/setup#auth0", available: false },
  { slug: "clerk", label: "Clerk", href: "/docs/setup#clerk", available: false },
  { slug: "nextauth", label: "NextAuth", href: "/docs/setup#nextauth", available: false },
  { slug: "firebase", label: "Firebase", href: "/docs/setup#firebase", available: false },
  { slug: "custom", label: "Custom", href: "/docs/setup#custom", available: false },
];

export default function SetupGuidesPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          Setup guides
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Connect your link rail to your auth or transactional email provider. Pick your stack.
        </p>

        <ul className="mt-10 space-y-4">
          {GUIDES.map(({ slug, label, href, available }) => (
            <li key={slug}>
              {available ? (
                <Link
                  href={href}
                  className="block rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--bg2)]"
                >
                  <span className="font-medium text-[var(--text)]">{label}</span>
                  <span className="ml-2 text-sm text-[var(--accent)]">→</span>
                </Link>
              ) : (
                <div
                  id={slug}
                  className="block rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg2)]/50 p-4 opacity-75"
                >
                  <span className="font-medium text-[var(--text)]">{label}</span>
                  <span className="ml-2 text-xs text-[var(--muted)]">(coming soon)</span>
                </div>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-10">
          <Link href="/docs" className="link-accent text-sm">
            Back to Docs →
          </Link>
        </p>
      </div>
    </div>
  );
}
