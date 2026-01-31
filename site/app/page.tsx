import type { Metadata } from "next";
import Link from "next/link";
import DemoBeforeAfter from "./components/DemoBeforeAfter";

export const metadata: Metadata = {
  title: "Suqram — Stop scanners from consuming magic links",
  description:
    "Email security scanners pre-open links and burn one-time tokens. Suqram blocks scanner redemption at the edge—without adding friction for real users.",
};

const CONTAINER = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";
const SECTION_PY = "py-20 sm:py-24 lg:py-28";
const SECTION_HEADING = "section-h2 text-center";
const SECTION_SUB = "mt-3 text-center text-[var(--text2)] max-w-2xl mx-auto";

const PROOF_CHIPS = [
  "Works with Supabase / any auth",
  "No SDK required",
  "Edge-native (Cloudflare)",
];

const WHY_ITEMS = [
  "Security scanners pre-open links",
  "One-time tokens get consumed",
  "Users hit expired links → lost signups + support tickets",
];

const FAQ_ITEMS = [
  {
    q: "Does this slow down login?",
    a: "No. The edge check is fast; real users get a quick path through.",
  },
  {
    q: "Will scanners be blocked?",
    a: "They can fetch the link page, but scanner requests don't redeem tokens—only a human-confirmed click does.",
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
      {/* Hero */}
      <section className={`hero-bg ${SECTION_PY}`} id="hero">
        <div className={`${CONTAINER}`}>
          <div className="max-w-3xl">
            <p className="pill-hero inline-flex items-center gap-2 text-xs">
              <span className="pill-hero-dot" aria-hidden />
              Scanner-proof magic links
            </p>
            <h1 className="hero-h1 mt-8">
              Stop scanners from consuming magic links.
            </h1>
            <p className="mt-6 body-hero text-[var(--text2)] leading-relaxed">
              Email security scanners pre-open links and burn one-time tokens. Suqram blocks scanner redemption at the edge—without adding friction for real users.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-3">
              <Link href="#demo" className="btn-hero">
                Try the demo
              </Link>
              <Link href="/app" className="btn-secondary text-sm">
                Deploy free
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {PROOF_CHIPS.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs text-[var(--muted)]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Demo (star section) */}
      <section className="pb-20 sm:pb-24 lg:pb-28" id="demo" aria-label="Demo">
        <div className={CONTAINER}>
          <DemoBeforeAfter />
        </div>
      </section>

      {/* Why / Problem */}
      <section className={SECTION_PY} id="why" aria-label="Why">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Why users see &quot;Link expired&quot; even when you did everything right.
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {WHY_ITEMS.map((text, i) => (
              <div
                key={i}
                className="surface p-6 text-center"
              >
                <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-sm font-semibold text-[var(--text)] mb-4">
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-[var(--text)] leading-snug">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={SECTION_PY} id="how" aria-label="How it works">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Human-only redemption, enforced at the edge.
          </h2>
          <div className="mt-14 max-w-2xl mx-auto surface p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                Scanner path
              </span>
              <span className="text-sm text-[var(--text2)]">
                Email link → Suqram edge → non-redeeming response → token remains unused
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--error-muted)] shrink-0" aria-hidden />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[var(--accent-dim)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1 text-xs font-medium text-[var(--accent)] uppercase tracking-wide">
                Human path
              </span>
              <span className="text-sm text-[var(--text2)]">
                Email link → Suqram edge → confirm (only if needed) → your app verifies → success
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" aria-hidden />
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Scanner requests don&apos;t redeem tokens. Only a human-confirmed click does.
          </p>
        </div>
      </section>

      {/* Deploy free */}
      <section className={SECTION_PY} id="quickstart" aria-label="Deploy">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Deploy free in minutes
          </h2>
          <p className={`${SECTION_SUB} mt-4`}>
            After you try the demo, create your site and we&apos;ll give you a protected link format to paste into Supabase email templates.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/app" className="btn-hero">
              Deploy free
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={SECTION_PY} id="pricing" aria-label="Pricing">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Start free. Upgrade when usage grows.
          </h2>
          <div className="mt-12 max-w-3xl mx-auto surface p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="rounded-xl border border-[var(--accent)]/[0.22] bg-[rgba(37,230,214,0.06)] p-6 flex flex-col">
                <p className="text-sm font-semibold text-[var(--accent)]">Free</p>
                <p className="mt-2 text-sm text-[var(--text2)]">1K redemptions / month — $0</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Get started</p>
                <Link href="/app" className="btn-primary mt-6 w-full justify-center text-sm">
                  Deploy free
                </Link>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-6 flex flex-col">
                <p className="text-sm font-semibold text-[var(--text)]">Pro</p>
                <p className="mt-2 text-sm text-[var(--text2)]">10K / month</p>
                <p className="mt-1 text-xs text-[var(--muted)]">For growing apps</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-6 flex flex-col">
                <p className="text-sm font-semibold text-[var(--text)]">Scale</p>
                <p className="mt-2 text-sm text-[var(--text2)]">Custom</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Enterprise</p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-[var(--muted)] max-w-xl mx-auto">
            A redemption is a successful human-confirmed link use.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className={SECTION_PY} id="faq" aria-label="FAQ">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            FAQ
          </h2>
          <dl className="mt-12 max-w-2xl mx-auto space-y-6">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q} className="surface p-6">
                <dt className="text-sm font-semibold text-[var(--text)]">{q}</dt>
                <dd className="mt-2 text-sm text-[var(--text2)] leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
