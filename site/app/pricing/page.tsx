import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Auth Link Rail",
  description: "Free tier and usage-based pricing. You only pay for successful redemptions.",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "No credit card. 500 successful redemptions/month.",
    redeems: "500 successful redemptions",
    domains: "1 domain",
    support: "Community support",
    cta: "Start free",
    href: "/start",
    featured: false,
    pill: "Free tier",
  },
  {
    name: "Indie",
    price: "$19",
    period: "/month",
    description: "For growing apps and small teams.",
    redeems: "5,000 redemptions included",
    domains: "2 domains",
    support: "Email support",
    cta: "Get Indie",
    href: "/start",
    featured: true,
    pill: "Popular",
  },
  {
    name: "Growth",
    price: "$49",
    period: "/month",
    description: "Higher volume and priority help.",
    redeems: "25,000 redemptions included",
    domains: "5 domains",
    support: "Priority support",
    cta: "Get Growth",
    href: "/start",
    featured: false,
    pill: null,
  },
];

const COST_PER_1K = [
  { tier: "Free", redeems: "0–500/mo", cost: "$0", per1k: "—" },
  { tier: "Indie", redeems: "0–5k/mo", cost: "$19 flat", per1k: "~$3.80/1k" },
  { tier: "Growth", redeems: "0–25k/mo", cost: "$49 flat", per1k: "~$1.96/1k" },
  { tier: "Overage", redeems: "Beyond included", cost: "Usage-based", per1k: "TBD" },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          Pricing
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-[var(--muted)]">
          You only pay for successful redemptions. No charge when a link is scanned but not
          clicked by a real user.
        </p>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`card card-gradient-top relative p-6 sm:p-8 ${
              tier.featured ? "border-[var(--accent)]" : ""
            }`}
          >
            {tier.pill && (
              <span
                className={`absolute -top-3 left-1/2 -translate-x-1/2 ${
                  tier.featured ? "pill-popular" : "pill"
                }`}
              >
                {tier.pill}
              </span>
            )}
            <h2 className="text-lg font-semibold text-[var(--text)]">{tier.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{tier.description}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${tier.featured ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{tier.price}</span>
              <span className="text-[var(--muted)]">{tier.period}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-[var(--muted)]">
              <li>{tier.redeems}</li>
              <li>{tier.domains}</li>
              <li>{tier.support}</li>
            </ul>
            <a
              href={tier.href}
              className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200 ${
                tier.featured
                  ? "btn-primary"
                  : "btn-secondary"
              }`}
            >
              {tier.cta}
            </a>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-[var(--muted)]">
        A redemption = a user successfully completing the link. You only pay for successful
        redemptions; scans and failed attempts don&apos;t count.
      </p>

      {/* Cost per 1k redeems (static table) */}
      <div className="mt-20">
        <h2 className="text-center text-xl font-bold tracking-tight text-[var(--text)]">
          Cost per 1,000 successful redemptions
        </h2>
        <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead>
              <tr className="bg-[var(--bg2)]">
                <th className="px-4 py-4 text-left text-sm font-semibold text-[var(--text)]">
                  Tier
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-[var(--text)]">
                  Redeems
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-[var(--text)]">
                  Cost
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-[var(--text)]">
                  Per 1k redeems
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {COST_PER_1K.map((row) => (
                <tr key={row.tier}>
                  <td className="px-4 py-4 text-sm text-[var(--text)]">{row.tier}</td>
                  <td className="px-4 py-4 text-sm text-[var(--muted)]">{row.redeems}</td>
                  <td className="px-4 py-4 text-sm text-[var(--muted)]">{row.cost}</td>
                  <td className="px-4 py-4 text-sm text-[var(--muted)]">{row.per1k}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          Overage pricing TBD. Contact us for high-volume or enterprise.
        </p>
      </div>
    </div>
  );
}
