import type { Metadata } from "next";
import Link from "next/link";

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Pricing — Suqram",
  description: "Free tier and usage-based pricing. You only pay for successful interactive redemptions.",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    summary: "1K redemptions/mo",
    description: "No credit card. One domain.",
    cta: "Create free site",
    href: "/start",
    featured: true,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    summary: "10K redemptions/mo",
    description: "Growing apps. Multiple domains.",
    cta: null,
    href: "/start",
    featured: false,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "",
    summary: "High volume",
    description: "Enterprise. Dedicated support.",
    cta: null,
    href: "/start",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="text-center">
        <h1 className="section-h2">
          Pricing
        </h1>
        <p className="mt-3 max-w-xl mx-auto text-[var(--text-secondary)] text-base leading-relaxed">
          You only pay for successful redemptions. Scans and failed attempts don&apos;t count.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-3 sm:grid-rows-1 sm:items-stretch">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`pricing-tier flex flex-col ${
              tier.featured
                ? "pricing-tier-featured"
                : "pricing-tier-quiet"
            }`}
          >
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
              {tier.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
              {tier.summary}
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span
                className={
                  tier.featured
                    ? "text-2xl font-bold tracking-tight text-[var(--primary)]"
                    : "text-xl font-semibold tracking-tight text-[var(--text)]"
                }
              >
                {tier.price}
              </span>
              {tier.period && (
                <span className="text-sm text-[var(--muted)]">{tier.period}</span>
              )}
            </div>
            <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
              {tier.description}
            </p>
            <div className="mt-auto pt-6">
              {tier.cta ? (
                <Link href={tier.href} className="pricing-cta-primary">
                  {tier.cta}
                </Link>
              ) : (
                <Link href={tier.href} className="pricing-cta-quiet">
                  Learn more
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-[var(--muted)] max-w-xl mx-auto">
        A redemption is a successful interactive link use.
      </p>
    </div>
  );
}
