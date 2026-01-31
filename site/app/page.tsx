import type { Metadata } from "next";
import Link from "next/link";
import DemoSection from "./components/DemoSection";

export const metadata: Metadata = {
  title: "Suqram — Magic links that survive Safe Links and security scanners",
  description:
    "Scanner-proof auth links. Stop losing users to link expired when corporate scanners pre-open one-time auth links.",
};

const CONTAINER = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";
const HERO_PY = "py-20 sm:py-24 lg:py-28";

const DASHBOARD_METRICS = [
  { value: "0", label: "Protected Apps", desc: "Apps with scanner-proof auth flows" },
  { value: "0", label: "Blocked Scanner Opens", desc: "Prefetch attempts stopped this month" },
  { value: "0", label: "Human Redemptions", desc: "Successful user-only magic link redeems" },
  { value: "0", label: "Tickets Avoided", desc: "Avoided \"link expired\" complaints" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero: centered, one promise, one CTA */}
      <section className={`hero-bg ${HERO_PY}`}>
        <div className={`${CONTAINER} text-center`}>
          <p className="pill-hero inline-flex items-center gap-2 text-xs">
            <span className="pill-hero-dot" aria-hidden />
            Scanner-proof auth links
          </p>
          <h1 className="hero-h1 mt-8 max-w-4xl mx-auto">
            Magic links that survive Safe Links and security scanners.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto body-hero leading-relaxed">
            See the difference in seconds.
          </p>
          <p className="mt-3 max-w-2xl mx-auto body-hero leading-relaxed text-[var(--text2)]">
            Suqram adds a human-confirmed click so only the real user can redeem.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="#demo" className="btn-hero">
              Try the demo
            </Link>
            <Link href="/start" className="btn-secondary text-sm">
              Generate protected link
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            No spam. No signup required to run a test.
          </p>
        </div>
      </section>

      {/* Two-link demo: unprotected (expired) vs protected (success) */}
      <DemoSection />

      {/* Empty dashboard teaser */}
      <section className="pt-20 sm:pt-24 pb-24 sm:pb-32" aria-label="Product preview">
        <div className={`${CONTAINER} max-w-4xl mx-auto`}>
          <div className="card overflow-hidden rounded-2xl">
            <div className="p-5 sm:p-6 border-b border-[var(--border)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
                {DASHBOARD_METRICS.map(({ value, label, desc }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4"
                  >
                    <p className="text-2xl font-semibold tracking-tight text-[var(--text)]">
                      {value}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--text)]">
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] min-h-[120px] flex items-center justify-center">
                <p className="text-sm text-[var(--muted)]">
                  Activity will appear here
                </p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Connect in minutes — Supabase-ready, works with any auth provider.
          </p>
        </div>
      </section>
    </>
  );
}
