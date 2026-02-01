import type { Metadata } from "next";
import Link from "next/link";
import DemoBeforeAfter from "./components/DemoBeforeAfter";

export const metadata: Metadata = {
  title: "Suqram — Protocol-grade auth links",
  description:
    "View-safe, exactly-once redemption. Magic links that survive scanners. Dev infra for auth links.",
};

const CONTAINER = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";
const SECTION_PY = "py-16 sm:py-20 lg:py-24";
const SECTION_HEADING = "section-h2 text-center";
const SECTION_SUB = "mt-3 text-center text-[var(--text-secondary)] max-w-2xl mx-auto";

const INVARIANT_TILES = [
  {
    title: "View-safe",
    body: "Scanners can fetch the link page without consuming the token. Only interactive redemption counts.",
  },
  {
    title: "Exactly-once redeem",
    body: "One successful redemption per link. Replay and pre-open don't burn the token.",
  },
  {
    title: "Replay-safe retries",
    body: "Retries and duplicate requests are detected. Your auth stays deterministic.",
  },
  {
    title: "Works with existing auth",
    body: "Point your link domain to the rail. No SDK; swap the URL in your email template.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Does this slow down login?",
    a: "No. The edge check is fast; real users get a quick path through.",
  },
  {
    q: "Will scanners be blocked?",
    a: "They can fetch the link page, but scanner requests don't redeem tokens—only interactive redemption does.",
  },
  {
    q: "Do I need an SDK?",
    a: "No. Point your link domain to Suqram and swap the link in your email template.",
  },
  {
    q: "Works with Supabase / Firebase / custom?",
    a: "Yes. Works with any auth that uses one-time links in email.",
  },
  {
    q: "What about passkeys?",
    a: "Compatible. Suqram protects the email link path; passkeys are unaffected.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero: concrete claim + proof widget */}
      <section className={`${SECTION_PY}`} id="hero">
        <div className={CONTAINER}>
          <div className="max-w-3xl">
            <p className="pill-hero inline-flex items-center gap-2 text-xs">
              <span className="pill-hero-dot" aria-hidden />
              Protocol-grade auth links
            </p>
            <h1 className="hero-h1 mt-6">
              View-safe, exactly-once redemption. No scanner burn.
            </h1>
            <p className="mt-5 body-hero text-[var(--text-secondary)] leading-relaxed">
              Email security tools pre-open links and burn one-time tokens. Suqram enforces interactive redemption at the edge—scanners don't consume; only a confirmed click redeems.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
              <Link href="#demo" className="btn-hero">
                Run demo
              </Link>
              <Link href="/app" className="btn-secondary text-sm">
                Create site
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Demo (proof widget) */}
      <section className="pb-16 sm:pb-20 lg:pb-24" id="demo" aria-label="Demo">
        <div className={CONTAINER}>
          <DemoBeforeAfter />
        </div>
      </section>

      {/* Invariant tiles */}
      <section className={SECTION_PY} id="invariants" aria-label="Invariants">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Invariants
          </h2>
          <p className={`${SECTION_SUB} mt-2`}>
            Protocol guarantees your auth can rely on.
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {INVARIANT_TILES.map(({ title, body }) => (
              <div
                key={title}
                className="border border-[var(--border)] rounded-lg p-5 bg-[var(--surface)]"
              >
                <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How: interactive redemption */}
      <section className={SECTION_PY} id="how" aria-label="How it works">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Interactive redemption, enforced at the edge
          </h2>
          <div className="mt-10 max-w-2xl mx-auto border border-[var(--border)] rounded-lg p-6 bg-[var(--surface)] space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill text-xs">Scanner path</span>
              <span className="text-sm text-[var(--text-secondary)]">
                Email link → Suqram edge → non-redeeming response → token remains unused
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--status-error)] shrink-0" aria-hidden />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill-accent text-xs">Interactive path</span>
              <span className="text-sm text-[var(--text-secondary)]">
                Email link → Suqram edge → confirm (only if needed) → your app verifies → success
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--status-success)] shrink-0" aria-hidden />
            </div>
          </div>
          <p className="mt-5 text-center text-sm text-[var(--muted)]">
            Scanner requests don&apos;t redeem tokens. Only interactive redemption does.
          </p>
        </div>
      </section>

      {/* Deploy */}
      <section className={SECTION_PY} id="quickstart" aria-label="Deploy">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Deploy in minutes
          </h2>
          <p className={`${SECTION_SUB} mt-2`}>
            Create your site and get a protected link format to paste into Supabase (or any) email templates.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/app" className="btn-hero">
              Create site
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={SECTION_PY} id="pricing" aria-label="Pricing">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Start free. Scale when you need it.
          </h2>
          <div className="mt-10 max-w-3xl mx-auto border border-[var(--border)] rounded-lg p-6 bg-[var(--surface)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary-muted)] p-5 flex flex-col">
                <p className="text-sm font-semibold text-[var(--primary)]">Free</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">1K redemptions / month — $0</p>
                <Link href="/app" className="btn-primary mt-5 w-full justify-center text-sm">
                  Create site
                </Link>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-5 flex flex-col">
                <p className="text-sm font-semibold text-[var(--text)]">Pro</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">10K / month</p>
                <p className="mt-1 text-xs text-[var(--muted)]">For growing apps</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-5 flex flex-col">
                <p className="text-sm font-semibold text-[var(--text)]">Scale</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Custom</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Enterprise</p>
              </div>
            </div>
          </div>
          <p className="mt-5 text-center text-sm text-[var(--muted)] max-w-xl mx-auto">
            A redemption is a successful interactive link use.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className={SECTION_PY} id="faq" aria-label="FAQ">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            FAQ
          </h2>
          <dl className="mt-10 max-w-2xl mx-auto space-y-4">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q} className="border-b border-[var(--border)] pb-4 last:border-0">
                <dt className="text-sm font-semibold text-[var(--text)]">{q}</dt>
                <dd className="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
