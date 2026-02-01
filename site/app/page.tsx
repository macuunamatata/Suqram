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

const CONTAINER = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";
const SECTION_PY = "py-16 sm:py-20 lg:py-24";
const SECTION_HEADING = "text-2xl sm:text-3xl font-semibold tracking-tight text-foreground";
const SECTION_SUB = "mt-3 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed";

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
    title: "Works with existing auth",
    body: "Point your link domain to the rail. No SDK; swap the URL in your email template.",
  },
];

const FAQ_ITEMS = [
  { q: "Does this slow down login?", a: "No. The edge check is fast; real users get a quick path through." },
  { q: "Will scanners be blocked?", a: "They can fetch the link page, but scanner requests don't redeem tokens—only interactive redemption does." },
  { q: "Do I need an SDK?", a: "No. Point your link domain to Suqram and swap the link in your email template." },
  { q: "Does it work with my existing auth?", a: "Yes. If your auth uses one-time links in email (login, verify, reset, invite), you can protect them—custom code, frameworks, or hosted providers." },
  { q: "What about passkeys?", a: "Compatible. Suqram protects the email link path; passkeys are unaffected." },
];

const HERO_CHIPS = ["View-safe", "Exactly-once redeem", "No SDK", "Works with any auth"];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className={SECTION_PY} id="hero">
        <div className={CONTAINER}>
          <SectionFade>
            <div className="max-w-3xl mx-auto text-center sm:text-left">
              <Badge variant="secondary" className="mb-4 font-medium">
                Protocol-grade auth links
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.12] mt-2">
                Links that survive the real world.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
                Email scanners pre-open links and burn one-time tokens. Suqram runs at the edge so only an interactive redemption counts—your one-time links stay unbreakable.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {HERO_CHIPS.map((label) => (
                  <Badge key={label} variant="outline" className="font-normal text-muted-foreground">
                    {label}
                  </Badge>
                ))}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
                <Button asChild size="lg" className="h-11 px-6">
                  <Link href="#demo">Run demo</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 px-6">
                  <Link href="/app">Create site</Link>
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                For login, verify, invites, and reset links.
              </p>
            </div>
          </SectionFade>
        </div>
      </section>

      {/* Demo */}
      <section className="pb-16 sm:pb-20 lg:pb-24" id="demo" aria-label="Demo">
        <div className={CONTAINER}>
          <SectionFade>
            <DemoBeforeAfter />
          </SectionFade>
        </div>
      </section>

      {/* Invariants */}
      <section className={SECTION_PY} id="invariants" aria-label="Invariants">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>Invariants</h2>
            <p className={`${SECTION_SUB} mt-2 text-center`}>
              Protocol guarantees your auth can rely on.
            </p>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {INVARIANT_TILES.map(({ title, body }) => (
                <div
                  key={title}
                  className="rounded-lg border border-border bg-card p-5 shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground max-w-xl mx-auto">
              Works with any auth provider that sends one-time links: custom auth, frameworks, and hosted providers.
            </p>
          </SectionFade>
        </div>
      </section>

      <Separator className="mx-auto max-w-[1120px]" />

      {/* How it works */}
      <section className={SECTION_PY} id="how" aria-label="How it works">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>
              Interactive redemption, enforced at the edge.
            </h2>
            <div className="mt-10 max-w-2xl mx-auto space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Scanner path:</span> Email link → Suqram edge → non-redeeming response → token remains unused.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Interactive path:</span> Email link → Suqram edge → (optional confirm) → your app verifies → success.
              </p>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Scanner requests don&apos;t redeem tokens. Only interactive redemption does.
            </p>
          </SectionFade>
        </div>
      </section>

      <Separator className="mx-auto max-w-[1120px]" />

      {/* Deploy */}
      <section className={SECTION_PY} id="quickstart" aria-label="Deploy">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>Deploy in minutes.</h2>
            <p className={`${SECTION_SUB} mt-2 text-center`}>
              Create your site and get a protected link format to paste into your auth emails.
            </p>
            <p className="mt-2 text-center text-sm text-muted-foreground max-w-xl mx-auto">
              Works with login, verify email, invites, and password reset.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link href="/app">Create site</Link>
              </Button>
            </div>
          </SectionFade>
        </div>
      </section>

      <Separator className="mx-auto max-w-[1120px]" />

      {/* Pricing */}
      <section className={SECTION_PY} id="pricing" aria-label="Pricing">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>Start free. Scale when you need it.</h2>
            <div className="mt-12 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:items-stretch">
              <div className="rounded-lg border border-primary/20 bg-card p-6 shadow-sm flex flex-col">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Free</h3>
                <p className="mt-1 text-sm text-muted-foreground">1K redemptions / month</p>
                <p className="mt-4 text-2xl font-bold text-primary">$0</p>
                <p className="text-sm text-muted-foreground">/ month</p>
                <p className="mt-3 text-sm text-muted-foreground">No credit card.</p>
                <div className="mt-auto pt-6">
                  <Button asChild className="w-full">
                    <Link href="/start">Create free site</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-6 shadow-sm flex flex-col">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Pro</h3>
                <p className="mt-1 text-sm text-muted-foreground">10K redemptions / month</p>
                <p className="mt-4 text-xl font-semibold text-foreground">$19</p>
                <p className="text-sm text-muted-foreground">/ month</p>
                <p className="mt-3 text-sm text-muted-foreground">Growing apps.</p>
                <div className="mt-auto pt-6">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/pricing">Learn more</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-6 shadow-sm flex flex-col">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Scale</h3>
                <p className="mt-1 text-sm text-muted-foreground">High volume</p>
                <p className="mt-4 text-xl font-semibold text-foreground">Custom pricing</p>
                <p className="mt-3 text-sm text-muted-foreground">Enterprise.</p>
                <div className="mt-auto pt-6">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/pricing">Learn more</Link>
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-10 text-center text-sm text-muted-foreground max-w-xl mx-auto">
              A redemption is a successful interactive link use.
            </p>
          </SectionFade>
        </div>
      </section>

      <Separator className="mx-auto max-w-[1120px]" />

      {/* FAQ */}
      <section className={SECTION_PY} id="faq" aria-label="FAQ">
        <div className={CONTAINER}>
          <SectionFade>
            <h2 className={`${SECTION_HEADING} text-center`}>FAQ</h2>
            <div className="mt-10 max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="rounded-lg border border-border bg-card px-4 shadow-sm">
                {FAQ_ITEMS.map(({ q, a }) => (
                  <AccordionItem key={q} value={q}>
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      {q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
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
