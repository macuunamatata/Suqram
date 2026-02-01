import type { Metadata } from "next";
import Link from "next/link";
import DemoBeforeAfter from "./components/DemoBeforeAfter";
import SectionFade from "./components/SectionFade";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Suqram — Unbreakable auth links",
  description:
    "Links that survive the real world. Edge solution for magic links—scanners don't burn tokens; only a real click redeems.",
};

const CONTAINER = "mx-auto w-full max-w-[1200px] px-6 sm:px-8";
const SECTION_PY = "py-16 sm:py-20 lg:py-24";
const SECTION_HEADING = "text-2xl sm:text-3xl font-semibold tracking-tight text-foreground";
const SECTION_SUB = "mt-3 text-base text-muted-foreground max-w-2xl leading-relaxed";

const INVARIANT_TILES = [
  {
    title: "View-safe",
    body: "Scanners can fetch the link page without consuming the token. Only interactive redemption counts.",
  },
  {
    title: "Exactly-once redeem",
    body: "One successful redemption per link. Replay and pre-open do not burn the token.",
  },
  {
    title: "Replay-safe retries",
    body: "Retries and duplicate requests are detected. Your auth stays deterministic.",
  },
  {
    title: "No SDK",
    body: "Point your link domain to the rail. Swap the URL in your email template.",
  },
];

const FAQ_ITEMS = [
  { q: "Does this slow down login?", a: "No. The edge check is fast; real users get a quick path through." },
  { q: "Will scanners be blocked?", a: "They can fetch the link page, but scanner requests don't redeem tokens—only interactive redemption does." },
  { q: "Do I need an SDK?", a: "No. Point your link domain to Suqram and swap the link in your email template." },
  { q: "Does it work with my existing auth?", a: "Yes. If your auth uses one-time links in email (login, verify, reset, invite), you can protect them—custom code, frameworks, or hosted providers." },
  { q: "What about passkeys?", a: "Compatible. Suqram protects the email link path; passkeys are unaffected." },
];

const HERO_CHIPS = ["View-safe", "Exactly-once redeem", "Replay-safe retries", "No SDK"];

export default function HomePage() {
  return (
    <>
      {/* Hero: two-column on desktop, stack on mobile */}
      <section className="pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 lg:pb-24" id="hero">
        <div className={CONTAINER}>
          <SectionFade>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5 flex flex-col">
                <Badge variant="secondary" className="mb-4 w-fit font-medium text-xs">
                  Protocol-grade auth links
                </Badge>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight text-foreground leading-[1.1]">
                  Links that survive the real world.
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
                  Email scanners pre-open links and burn one-time tokens. Suqram runs at the edge so only an interactive redemption counts—your one-time links stay unbreakable.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {HERO_CHIPS.map((label) => (
                    <Badge key={label} variant="outline" className="font-normal text-muted-foreground text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
                <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                  <Button asChild size="lg" className="h-12 px-8 text-base">
                    <Link href="#demo">Run demo</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                    <Link href="/app">Create site</Link>
                  </Button>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  For login, verify, invites, and reset links.
                </p>
              </div>
              <div id="demo" className="lg:col-span-7 flex items-start justify-center lg:justify-end scroll-mt-24">
                <div className="w-full max-w-[520px] lg:max-w-none">
                  <DemoBeforeAfter />
                </div>
              </div>
            </div>
          </SectionFade>
        </div>
      </section>

      <Separator className="max-w-[1200px] mx-auto opacity-60" />

      {/* Invariants */}
      <section className={SECTION_PY} id="invariants" aria-label="Invariants">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>Invariants</h2>
            <p className={`${SECTION_SUB} mt-3 text-center mx-auto`}>
              Protocol guarantees your auth can rely on.
            </p>
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {INVARIANT_TILES.map(({ title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border/80 bg-card/50 p-6 shadow-sm"
                >
                  <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
            <p className="mt-12 text-center text-sm text-muted-foreground max-w-xl mx-auto">
              Works with any auth provider that sends one-time links: custom auth, frameworks, and hosted providers.
            </p>
          </SectionFade>
        </div>
      </section>

      <Separator className="max-w-[1200px] mx-auto opacity-60" />

      {/* How it works */}
      <section className={SECTION_PY} id="how" aria-label="How it works">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>
              Interactive redemption, enforced at the edge.
            </h2>
            <div className="mt-12 max-w-2xl mx-auto space-y-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Scanner path:</span> Email link → Suqram edge → non-redeeming response → token remains unused.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Interactive path:</span> Email link → Suqram edge → (optional confirm) → your app verifies → success.
              </p>
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Scanner requests don&apos;t redeem tokens. Only interactive redemption does.
            </p>
          </SectionFade>
        </div>
      </section>

      <Separator className="max-w-[1200px] mx-auto opacity-60" />

      {/* Deploy */}
      <section className={SECTION_PY} id="quickstart" aria-label="Deploy">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>Deploy in minutes.</h2>
            <p className={`${SECTION_SUB} mt-3 text-center mx-auto`}>
              Create your site and get a protected link format to paste into your auth emails.
            </p>
            <p className="mt-3 text-center text-sm text-muted-foreground max-w-xl mx-auto">
              Works with login, verify email, invites, and password reset.
            </p>
            <div className="mt-10 flex justify-center">
              <Button asChild size="lg" className="h-12 px-8">
                <Link href="/app">Create site</Link>
              </Button>
            </div>
          </SectionFade>
        </div>
      </section>

      <Separator className="max-w-[1200px] mx-auto opacity-60" />

      {/* Pricing: Start free first */}
      <section className={SECTION_PY} id="pricing" aria-label="Pricing">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>Start free. Scale when you need it.</h2>
            <div className="mt-16 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:items-stretch">
              <div className="rounded-xl border border-primary/20 bg-card/50 p-8 shadow-sm flex flex-col order-first">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Free</h3>
                <p className="mt-2 text-sm text-muted-foreground">1K redemptions / month</p>
                <p className="mt-6 text-3xl font-bold text-primary">$0</p>
                <p className="text-sm text-muted-foreground">/ month</p>
                <p className="mt-4 text-sm text-muted-foreground">No credit card.</p>
                <div className="mt-auto pt-8">
                  <Button asChild className="w-full h-12">
                    <Link href="/start">Create free site</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border/80 bg-card/50 p-8 shadow-sm flex flex-col">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Pro</h3>
                <p className="mt-2 text-sm text-muted-foreground">10K redemptions / month</p>
                <p className="mt-6 text-2xl font-semibold text-foreground">$19</p>
                <p className="text-sm text-muted-foreground">/ month</p>
                <p className="mt-4 text-sm text-muted-foreground">Growing apps.</p>
                <div className="mt-auto pt-8">
                  <Button asChild variant="outline" className="w-full h-12">
                    <Link href="/pricing">Learn more</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border/80 bg-card/50 p-8 shadow-sm flex flex-col">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Scale</h3>
                <p className="mt-2 text-sm text-muted-foreground">High volume</p>
                <p className="mt-6 text-2xl font-semibold text-foreground">Custom pricing</p>
                <p className="mt-4 text-sm text-muted-foreground">Enterprise.</p>
                <div className="mt-auto pt-8">
                  <Button asChild variant="outline" className="w-full h-12">
                    <Link href="/pricing">Learn more</Link>
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-12 text-center text-sm text-muted-foreground max-w-xl mx-auto">
              A redemption is a successful interactive link use.
            </p>
          </SectionFade>
        </div>
      </section>

      <Separator className="max-w-[1200px] mx-auto opacity-60" />

      {/* FAQ */}
      <section className={SECTION_PY} id="faq" aria-label="FAQ">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>FAQ</h2>
            <div className="mt-12 max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="rounded-xl border border-border/80 bg-card/50 px-6 shadow-sm">
                {FAQ_ITEMS.map(({ q, a }) => (
                  <AccordionItem key={q} value={q} className="border-border/60">
                    <AccordionTrigger className="text-left hover:no-underline py-5">
                      {q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5">
                      {a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </SectionFade>
        </div>
      </section>
    </>
  );
}
