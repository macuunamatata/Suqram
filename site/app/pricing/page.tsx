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
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Pricing</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          You only pay for successful redemptions. No charge when a link is scanned but not
          clicked by a real user.
        </p>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-2xl border p-6 sm:p-8 ${
              tier.featured
                ? "border-sky-500 bg-sky-50/50 shadow-lg"
                : "border-slate-200 bg-white"
            }`}
          >
            {tier.featured && (
              <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-3 py-0.5 text-xs font-medium text-white">
                Popular
              </p>
            )}
            <h2 className="text-lg font-semibold text-slate-900">{tier.name}</h2>
            <p className="mt-1 text-slate-600">{tier.description}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{tier.price}</span>
              <span className="text-slate-500">{tier.period}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li>{tier.redeems}</li>
              <li>{tier.domains}</li>
              <li>{tier.support}</li>
            </ul>
            <a
              href={tier.href}
              className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                tier.featured
                  ? "bg-sky-600 text-white hover:bg-sky-700"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tier.cta}
            </a>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-slate-600">
        A redemption = a user successfully completing the link. You only pay for successful
        redemptions; scans and failed attempts don&apos;t count.
      </p>

      <p className="mt-4 text-center text-sm text-slate-500">
        You only pay for successful redemptions. Scans and failed attempts don&apos;t count.
      </p>

      {/* Cost per 1k redeems (static table) */}
      <div className="mt-16">
        <h2 className="text-center text-xl font-bold text-slate-900">
          Cost per 1,000 successful redemptions
        </h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Tier
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Redeems
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Per 1k redeems
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {COST_PER_1K.map((row) => (
                <tr key={row.tier}>
                  <td className="px-4 py-3 text-sm text-slate-900">{row.tier}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.redeems}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.cost}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.per1k}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          Overage pricing TBD. Contact us for high-volume or enterprise.
        </p>
      </div>
    </div>
  );
}
