import type { Metadata } from "next";
import Link from "next/link";
import ScannerDemo from "./components/ScannerDemo";
import ViewSafeDiagram from "./components/diagrams/ViewSafeDiagram";
import ExactlyOnceDiagram from "./components/diagrams/ExactlyOnceDiagram";
import NoSdkDiagram from "./components/diagrams/NoSdkDiagram";
import { Button } from "@/components/ui/button";

const FEATURE_DIAGRAMS = [ViewSafeDiagram, ExactlyOnceDiagram, NoSdkDiagram] as const;

export const metadata: Metadata = {
  title: "Suqram — Scanner-safe auth links",
  description:
    "Scanner-proof links and human click receipts. Prevent preview bots from triggering your auth workflows. Set up in minutes.",
};

const CONTAINER = "mx-auto w-full max-w-[1200px] px-6 sm:px-8";
const SECTION_PY = "py-16 sm:py-20 lg:py-24";

const TRUSTED_LOGOS = [
  "Acme",
  "BuildCo",
  "ShipIt",
  "LaunchPad",
  "ScaleUp",
];

const TESTIMONIALS = [
  {
    quote: "One-time links finally behave. Scanners stopped burning our magic-link tokens.",
    name: "Alex Chen",
    role: "Founder at AuthFlow",
  },
  {
    quote: "Set up in under 10 minutes. Our login links are now scanner-proof.",
    name: "Sam Rivera",
    role: "CTO at SecureApp",
  },
  {
    quote: "Human click receipts gave us the guarantee we needed for compliance.",
    name: "Jordan Lee",
    role: "Founder at VerifyLabs",
  },
];

const FEATURES = [
  {
    eyebrow: "View-safe",
    title: "Preview bots don’t consume the token",
    bullets: [
      "Scanners can fetch the link page without redeeming.",
      "Only an interactive click counts as redemption.",
      "One-time links stay valid until a human clicks.",
    ],
    side: "right" as const,
  },
  {
    eyebrow: "Exactly-once",
    title: "One redemption per link",
    bullets: [
      "Replay and pre-open do not burn the token.",
      "Retries and duplicate requests are detected.",
      "Deterministic auth you can rely on.",
    ],
    side: "left" as const,
  },
  {
    eyebrow: "No SDK",
    title: "Drop-in link protection",
    bullets: [
      "Point your link domain to the rail.",
      "Swap the URL in your email template.",
      "Works with any auth: custom, framework, or hosted.",
    ],
    side: "right" as const,
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 lg:pb-24" id="hero">
        <div className={CONTAINER}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-xl">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight text-foreground leading-[1.08]">
                Scanner-proof links.
                <br />
                Human click receipts.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Prevent preview bots from triggering your auth workflows. One-time links that only redeem on a real click. Set up in under 10 minutes.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
                <Button asChild size="lg" className="rounded-full h-12 px-8 font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/start">Get started</Link>
                </Button>
                <Link href="#pricing" className="inline-flex items-center gap-1.5 text-base font-medium text-muted-foreground hover:text-foreground transition-colors mt-2 sm:mt-0">
                  Pricing
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                For teams dealing with link scanners and preview bots.
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <ScannerDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="py-14 sm:py-16" id="trusted">
        <div className={CONTAINER}>
          <h2 className="text-center text-base font-semibold tracking-tight text-foreground mb-10">
            Trusted by fast-growing teams
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-6">
            {TRUSTED_LOGOS.map((name) => (
              <span
                key={name}
                className="text-lg font-semibold text-muted-foreground/80 tracking-tight"
                aria-hidden
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Built for (Finta-style: blue-highlight headline, social proof pill, testimonial cards) */}
      <section className={SECTION_PY} id="built-for">
        <div className={CONTAINER}>
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Built for <span className="text-primary">teams that rely on one-time links</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Suqram is for engineers and product teams who send magic links, verification links, and reset links in email. It’s the edge layer that keeps scanners from burning tokens—so only a real click redeems.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              <span>4.8 from 100+ teams</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
            {TESTIMONIALS.map(({ quote, name, role }) => (
              <div
                key={name}
                className="rounded-2xl bg-muted/30 border border-border/60 p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col"
              >
                <p className="text-sm text-foreground leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                    {name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature sections */}
      <section className={SECTION_PY} id="features">
        <div className={CONTAINER}>
          {FEATURES.map(({ eyebrow, title, bullets, side }, i) => (
            <div
              key={i}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${i > 0 ? "mt-20 lg:mt-28" : ""} ${side === "left" ? "lg:grid-flow-dense" : ""}`}
            >
              <div className={side === "left" ? "lg:col-start-2" : ""}>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                  {eyebrow}
                </p>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  {title}
                </h3>
                <ul className="mt-6 space-y-3">
                  {bullets.map((b, j) => (
                    <li key={j} className="flex gap-3 text-base text-muted-foreground leading-relaxed">
                      <span className="text-primary mt-1.5 shrink-0" aria-hidden>✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`rounded-xl border border-border bg-card/50 p-8 min-h-[200px] flex items-center justify-center ${side === "left" ? "lg:col-start-1 lg:row-start-1" : ""}`}>
                <div className="w-full max-w-[280px] flex items-center justify-center text-muted-foreground">
                  {(() => {
                    const Diagram = FEATURE_DIAGRAMS[i];
                    return <Diagram />;
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className={SECTION_PY} id="pricing">
        <div className={CONTAINER}>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Start free. Scale when you need it.
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Free tier: 1K redemptions per month. No credit card. Pro and Scale when you grow.
            </p>
            <div className="mt-10">
              <Button asChild size="lg" className="rounded-full h-12 px-10 font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/start">Get started free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
