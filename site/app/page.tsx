import type { Metadata } from "next";
import Link from "next/link";
import HomeEmailModule from "./HomeEmailModule";
import HomeFAQ from "./HomeFAQ";

export const metadata: Metadata = {
  title: "Auth Link Rail — Auth links that don't break in corporate inboxes",
  description:
    "Send yourself a test email. If your auth links break in corporate inboxes, you'll see it in 60 seconds.",
};

const STATS = [
  { label: "Free redemptions", value: "500/mo" },
  { label: "Inbox test", value: "60 sec" },
  { label: "Supabase-ready", value: "Yes" },
  { label: "Scanner-safe", value: "Always" },
];

const FEATURES = [
  {
    title: "Live inbox test",
    copy: "Send a test email and see protected vs normal links side by side. No setup.",
    icon: "✉️",
    mock: (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs font-mono text-[var(--muted-strong)]">
        you@company.com → Send test
      </div>
    ),
  },
  {
    title: "Protected links",
    copy: "Wrap any URL in a rail link. Scanners can't consume the token; only the real user can.",
    icon: "🔗",
    mock: (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs font-mono text-[var(--muted-strong)] break-all">
        go.suqram.com/r/abc#u=https%3A%2F%2F...
      </div>
    ),
  },
  {
    title: "Supabase integration",
    copy: "Paste the rail URL into your magic link or reset email template. One redirect, same UX.",
    icon: "⚡",
    mock: (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs text-[var(--muted-strong)]">
        Email template → {`{{ .ConfirmationURL }}`}
      </div>
    ),
  },
  {
    title: "Dashboard & logs",
    copy: "See redemptions, domains, and logs. Control where links are allowed to go.",
    icon: "📊",
    mock: (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs text-[var(--muted-strong)]">
        Redemptions: 127 · Domains: 1
      </div>
    ),
  },
];

const STEPS = [
  {
    title: "Run the inbox test",
    copy: "Send yourself a test email. Click protected vs normal link and see the difference in 60 seconds.",
    illustration: (
      <div className="flex h-24 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-4xl">
        ✉️
      </div>
    ),
  },
  {
    title: "Generate a protected link",
    copy: "Paste your destination URL and get a rail link. Copy it into your Supabase email template.",
    illustration: (
      <div className="flex h-24 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-4xl">
        🔗
      </div>
    ),
  },
  {
    title: "Paste into your app",
    copy: "Use the rail URL as the confirmation or reset link. One redirect; the user lands where you expect.",
    illustration: (
      <div className="flex h-24 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-4xl">
        ⚡
      </div>
    ),
  },
];

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "500 successful redemptions/month. No credit card.",
    cta: "Start free",
    href: "/start",
    featured: false,
  },
  {
    name: "Indie",
    price: "$19",
    period: "/month",
    description: "5,000 redemptions. For growing apps.",
    cta: "Get Indie",
    href: "/start",
    featured: true,
    pill: "Most Popular",
  },
  {
    name: "Growth",
    price: "$49",
    period: "/month",
    description: "25,000 redemptions. Priority support.",
    cta: "Get Growth",
    href: "/start",
    featured: false,
  },
];

const FAQ_ITEMS = [
  {
    q: "What is a redemption?",
    a: "A redemption is when a real user successfully completes a protected link (clicks through to the destination). Scans and scanner clicks don't count.",
  },
  {
    q: "Do I need to change my auth flow?",
    a: "No. You keep using Supabase (or any provider) for magic links and password reset. You only replace the link URL with the rail-protected URL.",
  },
  {
    q: "What happens when a scanner clicks the link?",
    a: "The rail issues a redirect that doesn't consume the one-time token. When the real user clicks later, the token is consumed and they reach the destination.",
  },
  {
    q: "Where is the marketing site hosted?",
    a: "The marketing site (suqram.com) is on Cloudflare Pages. The rail API (go.suqram.com) is a Cloudflare Worker. You can self-host the Worker if you prefer.",
  },
];

const CONTAINER = "mx-auto max-w-[1200px] px-4 sm:px-6";
const SECTION_PY = "py-16 sm:py-20";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className={`${SECTION_PY} ${CONTAINER} text-center`}>
        <p className="pill-hero inline-block text-xs">
          Auth links that don&apos;t break in corporate inboxes
        </p>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl leading-[1.15]">
          Magic links that survive Safe Links and scanners
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-[var(--muted)]">
          Corporate scanners click your links and consume one-time tokens. We protect your magic and reset links so only the real user can redeem them.
        </p>
        <div className="mt-10">
          <a href="#try" className="btn-hero">
            Send me the test email
          </a>
        </div>
      </section>

      {/* Try it: email form */}
      <section id="try" className={`section-border ${SECTION_PY} ${CONTAINER}`}>
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            See the difference in 60 seconds
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            We&apos;ll send you one email with a protected link and a normal link. Click both; only the protected one works twice.
          </p>
          <div className="mt-10">
            <HomeEmailModule />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className={`section-border ${SECTION_PY} ${CONTAINER}`}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map(({ label, value }) => (
            <div
              key={label}
              className="card p-6 text-center"
            >
              <p className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
                {value}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className={`section-border ${SECTION_PY} ${CONTAINER}`}>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl text-center">
          Scanners consume your one-time tokens
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-center text-[var(--muted)]">
          Safe Links, Mimecast, and other scanners click every link. With a normal magic link, the first click (the scanner) consumes the token. The user gets &quot;link expired&quot;.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-stretch justify-center gap-4 max-w-2xl mx-auto">
          <div className="card flex-1 p-5 text-center">
            <p className="text-sm font-semibold text-[var(--muted)]">Normal link</p>
            <p className="mt-2 text-lg font-bold text-[var(--text)]">1 click = consumed</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Scanner clicks first → user sees expired</p>
          </div>
          <div className="card flex-1 p-5 text-center border-[var(--accent)]/40 bg-[var(--accent-dim)]/30">
            <p className="text-sm font-semibold text-[var(--accent)]">Protected link</p>
            <p className="mt-2 text-lg font-bold text-[var(--text)]">Only real user consumes</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Scanner gets redirect; user gets through</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`section-border ${SECTION_PY} ${CONTAINER}`}>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl text-center">
          Features
        </h2>
        <p className="mt-3 max-w-xl mx-auto text-center text-[var(--muted)]">
          One rail: inbox test, link generator, Supabase-ready redirects, and control.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ title, copy, icon, mock }) => (
            <div key={title} className="card p-6">
              <span className="text-2xl" aria-hidden>{icon}</span>
              <h3 className="mt-3 text-lg font-semibold text-[var(--text)]">{title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{copy}</p>
              {mock}
            </div>
          ))}
        </div>
      </section>

      {/* How it works (steps) */}
      <section id="how" className={`section-border ${SECTION_PY} ${CONTAINER}`}>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl text-center">
          How it works
        </h2>
        <p className="mt-3 max-w-xl mx-auto text-center text-[var(--muted)]">
          Three steps from test to production.
        </p>
        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {STEPS.map(({ title, copy, illustration }, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto w-full max-w-[200px]">{illustration}</div>
              <p className="mt-4 text-sm font-semibold text-[var(--accent)]">Step {i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={`section-border ${SECTION_PY} ${CONTAINER}`}>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl text-center">
          Pricing
        </h2>
        <p className="mt-3 max-w-xl mx-auto text-center text-[var(--muted)]">
          You only pay for successful redemptions. No charge when a scanner clicks.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`card relative p-6 sm:p-8 ${tier.featured ? "border-[var(--accent)]" : ""}`}
            >
              {tier.featured && tier.pill && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 pill-accent">
                  {tier.pill}
                </span>
              )}
              <h3 className="text-lg font-semibold text-[var(--text)]">{tier.name}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{tier.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${tier.featured ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{tier.price}</span>
                <span className="text-[var(--muted)]">{tier.period}</span>
              </div>
              <Link
                href={tier.href}
                className={`mt-8 block w-full text-center ${tier.featured ? "btn-primary" : "btn-secondary"}`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={`section-border ${SECTION_PY} ${CONTAINER}`}>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl text-center">
          FAQ
        </h2>
        <div className="mt-12">
          <HomeFAQ items={FAQ_ITEMS} />
        </div>
      </section>

      {/* Final CTA */}
      <section className={`section-border ${SECTION_PY} ${CONTAINER}`}>
        <div className="max-w-2xl mx-auto text-center card p-10 sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Ready to try?
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            Run the inbox test or go straight to generating protected links.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#try" className="btn-hero w-full sm:w-auto">
              Send test email
            </a>
            <Link href="/start" className="btn-secondary w-full sm:w-auto">
              Integrate
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
