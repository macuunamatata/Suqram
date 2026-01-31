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

const PRICING_TIERS = [
  { name: "Free", redemptions: "1K / month", desc: "Get started" },
  { name: "Pro", redemptions: "10K / month", desc: "For growing apps" },
  { name: "Scale", redemptions: "Custom", desc: "Enterprise" },
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
              <Link href="#quickstart" className="btn-secondary text-sm">
                Deploy in 5 minutes
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
      <section className={`border-t border-[var(--border)] ${SECTION_PY}`} id="why" aria-label="Why">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Why users see &quot;Link expired&quot; even when you did everything right.
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {WHY_ITEMS.map((text, i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center"
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
      <section className={`border-t border-[var(--border)] ${SECTION_PY}`} id="how" aria-label="How it works">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Human-only redemption, enforced at the edge.
          </h2>
          <div className="mt-14 max-w-2xl mx-auto space-y-8">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
                Scanner path
              </h3>
              <p className="text-sm text-[var(--text2)] leading-relaxed">
                Email link → Suqram edge → non-redeeming response → token remains unused.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 border-[var(--accent-dim)]">
              <h3 className="text-sm font-medium text-[var(--accent)] uppercase tracking-wide mb-3">
                Human path
              </h3>
              <p className="text-sm text-[var(--text2)] leading-relaxed">
                Email link → Suqram edge → (optional confirm) → your app verifies token → success.
              </p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Scanner requests don&apos;t redeem tokens. Only a human-confirmed click does.
          </p>
        </div>
      </section>

      {/* Quickstart */}
      <section className={`border-t border-[var(--border)] ${SECTION_PY}`} id="quickstart" aria-label="Quickstart">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Deploy in &lt;5 minutes.
          </h2>
          <div className="mt-12 max-w-xl mx-auto space-y-6">
            <div className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Point your link domain (go.yourapp.com) to Suqram</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Set your allowlist / secret</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Swap one line in your auth email template</p>
              </div>
            </div>
          </div>
          <div className="mt-10 max-w-2xl mx-auto">
            <pre className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 text-xs sm:text-sm font-mono text-[var(--text2)] overflow-x-auto">
              <code>{`https://go.suqram.com/r/\${token}#u=\${encodeURIComponent(yourSuccessUrl)}`}</code>
            </pre>
          </div>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            <Link href="/docs" className="link-accent">Docs</Link> for full setup.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className={`border-t border-[var(--border)] ${SECTION_PY}`} id="pricing" aria-label="Pricing">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            Usage pricing based on redemptions.
          </h2>
          <div className="mt-12 overflow-x-auto max-w-3xl mx-auto">
            <table className="w-full border-collapse rounded-xl border border-[var(--border)] overflow-hidden">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text)]">Tier</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text)]">Redemptions</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text)]">Description</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_TIERS.map((tier) => (
                  <tr key={tier.name} className="border-b border-[var(--border)] last:border-b-0 bg-[var(--card)]">
                    <td className="py-4 px-6 text-sm font-medium text-[var(--text)]">{tier.name}</td>
                    <td className="py-4 px-6 text-sm text-[var(--text2)]">{tier.redemptions}</td>
                    <td className="py-4 px-6 text-sm text-[var(--muted)]">{tier.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-center text-sm text-[var(--muted)] max-w-xl mx-auto">
            A redemption is a successful human-confirmed link use.
          </p>
          <p className="mt-4 text-center">
            <Link href="/pricing" className="btn-secondary text-sm">
              See pricing
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className={`border-t border-[var(--border)] ${SECTION_PY}`} id="faq" aria-label="FAQ">
        <div className={CONTAINER}>
          <h2 className={SECTION_HEADING}>
            FAQ
          </h2>
          <dl className="mt-12 max-w-2xl mx-auto space-y-6">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
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
