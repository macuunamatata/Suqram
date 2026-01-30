import type { Metadata } from "next";
import Link from "next/link";
import HomeEmailModule from "./HomeEmailModule";
import HomeFAQ from "./HomeFAQ";
import Section from "./Section";
import IconBadge from "./components/IconBadge";
import { IconMail, IconLink, IconLightning, IconChart } from "./components/icons";

export const metadata: Metadata = {
  title: "Auth Link Rail — Magic links that survive Safe Links and corporate scanners",
  description:
    "Corporate email scanners click your links first. We protect magic and reset links so only the real user can complete them.",
};

const STATS = [
  { label: "Free redemptions", value: "500/mo" },
  { label: "Inbox test", value: "60 sec" },
  { label: "Supabase-ready", value: "Yes" },
  { label: "Scanner-safe", value: "Always" },
];

const FEATURES = [
  {
    title: "Inbox scanner test",
    copy: "See how Safe Links treats your links. One email, two links: normal (breaks) and protected (works).",
    detail: "Uses your real inbox.",
    icon: <IconMail />,
    mock: (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs font-mono text-[var(--muted-strong)]">
        you@company.com → Send test
      </div>
    ),
  },
  {
    title: "Rail-protected links",
    copy: "Wrap any URL in a Rail URL. Scanners get a redirect; only the user's click completes the flow.",
    detail: "One-time links stay one-time.",
    icon: <IconLink />,
    mock: (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs font-mono text-[var(--muted-strong)] break-all">
        go.suqram.com/r/abc#u=https%3A%2F%2F...
      </div>
    ),
  },
  {
    title: "Drop-in for Supabase",
    copy: "Use the Rail URL as your confirmation or reset link. Same redirect, same UX.",
    detail: `Replace {{ .ConfirmationURL }} in your template.`,
    icon: <IconLightning />,
    mock: (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs text-[var(--muted-strong)]">
        Email template → {`{{ .ConfirmationURL }}`}
      </div>
    ),
  },
  {
    title: "Dashboard and logs",
    copy: "View redemptions, allowed domains, and per-link logs.",
    detail: "Control where links are allowed to go.",
    icon: <IconChart />,
    mock: (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs text-[var(--muted-strong)]">
        Redemptions: 127 · Domains: 1
      </div>
    ),
  },
];

const STEPS = [
  {
    title: "Test in your inbox",
    copy: "We send two links to your email. Click both; the protected one works, the normal one fails after the scanner.",
    illustration: (
      <div className="flex h-24 items-center justify-center">
        <IconBadge accent>
          <IconMail />
        </IconBadge>
      </div>
    ),
  },
  {
    title: "Wrap links with Rail URL",
    copy: "Paste your destination URL into Rail. Copy the generated link into your auth email template.",
    illustration: (
      <div className="flex h-24 items-center justify-center">
        <IconBadge accent>
          <IconLink />
        </IconBadge>
      </div>
    ),
  },
  {
    title: "Paste into Supabase",
    copy: "Use the Rail URL as the magic link or reset link. One redirect. No flow changes.",
    illustration: (
      <div className="flex h-24 items-center justify-center">
        <IconBadge accent>
          <IconLightning />
        </IconBadge>
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
const HERO_PY = "py-16 sm:py-20 lg:py-24";

export default function HomePage() {
  return (
    <>
      {/* Hero: grid only here; subtle teal wash behind content */}
      <section className={`hero-bg ${HERO_PY}`}>
        <div className={`glow-teal ${CONTAINER} text-center`}>
          <p className="pill-hero inline-flex items-center gap-2 text-xs">
            <span className="pill-hero-dot" aria-hidden />
            Scanner-proof auth links
          </p>
          <h1 className="hero-h1 mt-8 max-w-4xl mx-auto">
            Magic links that work in corporate inboxes
          </h1>
          <p className="mt-6 max-w-2xl mx-auto body-hero leading-relaxed">
            Corporate email (Safe Links, Mimecast) clicks every link first. Your one-time magic link gets used before the user sees it. We fix that.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#try" className="btn-hero">
              Send test to my inbox
            </a>
            <a href="#how" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-ui">
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Try it: email form */}
      <Section id="try" containerClassName={CONTAINER}>
        <div className="max-w-lg mx-auto text-center">
          <h2 className="section-h2">
            Run the inbox scanner test
          </h2>
          <p className="mt-4 text-[var(--text-muted)] leading-relaxed max-w-xl mx-auto">
            We&apos;ll email you two links: a normal one (breaks) and a protected one (works). No signup.
          </p>
          <div className="mt-10">
            <HomeEmailModule />
          </div>
        </div>
      </Section>

      {/* Stats */}
      <Section containerClassName={CONTAINER}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map(({ label, value }) => (
            <div
              key={label}
              className="card card-padded text-center"
            >
              <p className="text-2xl font-bold tracking-tight text-accent sm:text-3xl">
                {value}
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Problem */}
      <Section containerClassName={CONTAINER}>
        <h2 className="section-h2 text-center">
          Why magic links break in corporate email
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-center body-text leading-relaxed">
          Safe Links, Mimecast, and similar tools open every link before the user. With a normal one-time link, that first open uses the link. The user sees &quot;link expired.&quot; Rail lets only the real user&apos;s click complete the link.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-stretch justify-center gap-4 max-w-2xl mx-auto">
          <div className="card card-padded flex-1 text-center">
            <p className="text-sm font-semibold text-[var(--text-muted)]">Normal link</p>
            <p className="mt-2 text-lg font-bold text-[var(--text)]">Scanner opens first → link used</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">User sees &quot;link expired&quot;</p>
          </div>
          <div className="card card-padded flex-1 text-center border-[var(--accent)]/30 bg-[var(--accent-dim)]/20">
            <p className="text-sm font-semibold text-accent">Rail-protected link</p>
            <p className="mt-2 text-lg font-bold text-[var(--text)]">Only user&apos;s click completes</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Scanner gets redirect; user gets through</p>
          </div>
        </div>
      </Section>

      {/* Features — ambient teal glow */}
      <Section id="features" glow="teal" containerClassName={CONTAINER}>
        <h2 className="section-h2 text-center">
          Features
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-center body-text leading-relaxed">
          Inbox test, link wrapper, Supabase drop-in, and dashboard.
        </p>
        <div className="mt-10 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ title, copy, detail, icon, mock }) => (
            <div key={title} className="card card-padded">
              <IconBadge>{icon}</IconBadge>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-heading)]">{title}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{copy}</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{detail}</p>
              {mock}
            </div>
          ))}
        </div>
      </Section>

      {/* How it works (steps) */}
      <Section id="how" containerClassName={CONTAINER}>
        <h2 className="section-h2 text-center">
          How it works
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-center body-text leading-relaxed">
          Test in your inbox, wrap links, paste into your auth provider.
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ title, copy, illustration }, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto w-full max-w-[200px]">{illustration}</div>
              <p className="mt-6 text-sm font-semibold text-[var(--accent)]">Step {i + 1}</p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--text-heading)]">{title}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{copy}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing" containerClassName={CONTAINER}>
        <h2 className="section-h2 text-center">
          Pricing
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-center body-text leading-relaxed">
          You only pay for successful redemptions. No charge when a scanner clicks.
        </p>
        <div className="mt-10 grid gap-4 sm:gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`card card-padded relative ${tier.featured ? "border-[var(--accent)]/50" : ""}`}
            >
              {tier.featured && tier.pill && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 pill-popular">
                  {tier.pill}
                </span>
              )}
              <h3 className="text-lg font-semibold text-[var(--text-heading)]">{tier.name}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{tier.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${tier.featured ? "text-accent" : "text-[var(--text)]"}`}>{tier.price}</span>
                <span className="text-[var(--text-muted)]">{tier.period}</span>
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
      </Section>

      {/* FAQ */}
      <Section id="faq" containerClassName={CONTAINER}>
        <h2 className="section-h2 text-center">
          FAQ
        </h2>
        <div className="mt-10">
          <HomeFAQ items={FAQ_ITEMS} />
        </div>
      </Section>

      {/* Final CTA */}
      <Section containerClassName={CONTAINER}>
        <div className="max-w-2xl mx-auto text-center card card-padded p-8 sm:p-10">
          <h2 className="section-h2">
            Ready to try?
          </h2>
          <p className="mt-6 body-text leading-relaxed">
            Run the inbox test or start integrating.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#try" className="btn-hero w-full sm:w-auto">
              Send test to my inbox
            </a>
            <Link href="/start" className="btn-secondary w-full sm:w-auto">
              Integrate
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
