import type { Metadata } from "next";
import Link from "next/link";
import DemoBeforeAfter from "./components/DemoBeforeAfter";

function BenefitCheck({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

export const metadata: Metadata = {
  title: "Suqram — Unbreakable auth links",
  description:
    "Links that survive the real world. Edge solution for magic links—scanners don't burn tokens; only a real click redeems.",
};

const CONTAINER = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";
const SECTION_PY = "py-20 sm:py-24 lg:py-28";
const SECTION_HEADING = "section-h2 text-center";
const SECTION_SUB = "mt-4 text-center text-[var(--text-secondary)] text-base max-w-2xl mx-auto leading-relaxed";

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
  {
    title: "AI Spend Authorization Rail",
    body: "One lane. One outcome: No request can burn variable AI cost unless it carries an edge-minted spend permit.",
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
      {/* Hero — value prop + benefit checkmarks + primary CTA */}
      <section className={`${SECTION_PY}`} id="hero">
        <div className={CONTAINER}>
          <div className="max-w-3xl">
            <p className="pill-hero inline-flex items-center gap-2 text-xs">
              <span className="pill-hero-dot" aria-hidden />
              Protocol-grade auth links
            </p>
            <h1 className="hero-h1 mt-6">
              Links that survive the real world.
            </h1>
            <p className="mt-5 body-hero text-[var(--text-secondary)] leading-relaxed">
              Email scanners pre-open links and burn one-time tokens. Suqram runs at the edge so only a real click redeems—your magic links stay unbreakable.
            </p>
            <ul className="mt-6 benefit-list" aria-label="Key benefits">
              <li className="benefit-item">
                <BenefitCheck className="benefit-check" aria-hidden />
                View-safe
              </li>
              <li className="benefit-item">
                <BenefitCheck className="benefit-check" aria-hidden />
                Exactly-once redeem
              </li>
              <li className="benefit-item">
                <BenefitCheck className="benefit-check" aria-hidden />
                No SDK
              </li>
            </ul>
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

      {/* Invariant tiles — premium surfaces, same shadow */}
      <section className={SECTION_PY} id="invariants" aria-label="Invariants">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Invariants
          </h2>
          <p className={`${SECTION_SUB} mt-2`}>
            Protocol guarantees your auth can rely on.
          </p>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {INVARIANT_TILES.map(({ title, body }) => (
              <div
                key={title}
                className="surface p-5"
              >
                <div className="flex items-center gap-2">
                  <BenefitCheck className="w-4 h-4 shrink-0 text-[var(--status-success)]" aria-hidden />
                  <h3 className="text-sm font-semibold text-[var(--text)] tracking-tight">{title}</h3>
                </div>
                <p className="mt-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How: interactive redemption — one surface, dividers */}
      <section className={SECTION_PY} id="how" aria-label="How it works">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Interactive redemption, enforced at the edge
          </h2>
          <div className="mt-12 max-w-2xl mx-auto surface p-6 sm:p-8 space-y-0">
            <div className="flex flex-wrap items-center gap-2 pb-5 border-b border-[var(--border)]">
              <span className="pill text-xs">Scanner path</span>
              <span className="text-sm text-[var(--text-secondary)]">
                Email link → Suqram edge → non-redeeming response → token remains unused
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--status-error)] shrink-0" aria-hidden />
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-5">
              <span className="pill-accent text-xs">Interactive path</span>
              <span className="text-sm text-[var(--text-secondary)]">
                Email link → Suqram edge → confirm (only if needed) → your app verifies → success
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--status-success)] shrink-0" aria-hidden />
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
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

      {/* Pricing — alternating section, Free emphasized */}
      <section className={`${SECTION_PY} section-alt`} id="pricing" aria-label="Pricing">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Start free. Scale when you need it.
          </h2>
          <div className="mt-12 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:items-stretch">
            <div className="pricing-tier pricing-tier-featured flex flex-col p-6">
              <h3 className="text-xl font-semibold tracking-tight text-[var(--text)]">Free</h3>
              <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">1K redemptions/mo</p>
              <p className="mt-4 text-2xl font-bold tracking-tight text-[var(--primary)]">$0</p>
              <p className="mt-1 text-sm text-[var(--muted)]">/month</p>
              <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">No credit card. One domain.</p>
              <div className="mt-auto pt-6">
                <Link href="/start" className="pricing-cta-primary block w-full text-center">
                  Create free site
                </Link>
              </div>
            </div>
            <div className="pricing-tier pricing-tier-quiet flex flex-col">
              <h3 className="text-xl font-semibold tracking-tight text-[var(--text)]">Pro</h3>
              <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">10K redemptions/mo</p>
              <p className="mt-4 text-xl font-semibold tracking-tight text-[var(--text)]">$19</p>
              <p className="mt-1 text-sm text-[var(--muted)]">/month</p>
              <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">Growing apps. Multiple domains.</p>
              <div className="mt-auto pt-6">
                <Link href="/pricing" className="pricing-cta-quiet">
                  Learn more
                </Link>
              </div>
            </div>
            <div className="pricing-tier pricing-tier-quiet flex flex-col">
              <h3 className="text-xl font-semibold tracking-tight text-[var(--text)]">Scale</h3>
              <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">High volume</p>
              <p className="mt-4 text-xl font-semibold tracking-tight text-[var(--text)]">Custom</p>
              <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">Enterprise. Dedicated support.</p>
              <div className="mt-auto pt-6">
                <Link href="/pricing" className="pricing-cta-quiet">
                  Learn more
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-10 text-center text-sm text-[var(--muted)] max-w-xl mx-auto">
            A redemption is a successful interactive link use.
          </p>
        </div>
      </section>

      {/* FAQ — alternating section */}
      <section className={`${SECTION_PY} section-alt`} id="faq" aria-label="FAQ">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            FAQ
          </h2>
          <dl className="mt-12 max-w-2xl mx-auto surface p-6 sm:p-8 divide-y divide-[var(--border)] first:pt-0 last:pb-0">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q} className="py-5 first:pt-0 last:pb-0">
                <dt className="text-sm font-semibold text-[var(--text)]">{q}</dt>
                <dd className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
