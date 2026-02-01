import type { Metadata } from "next";
import Link from "next/link";
import ScannerDemo from "./components/ScannerDemo";
import Section, { CONTAINER, SECTION_PY } from "./components/Section";
import EventTraceCard from "./components/EventTraceCard";
import InstallSteps from "./components/InstallSteps";
import DnsStatusCard from "./components/DnsStatusCard";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Suqram — Scanner-safe auth links",
  description:
    "Scanner-proof links and human click receipts. EIG. Prevent preview bots from triggering your auth workflows.",
};

const GRID_12 = "grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start";
const COL_5 = "col-span-12 lg:col-span-5";
const COL_7 = "col-span-12 lg:col-span-7";

export default function HomePage() {
  return (
    <>
      {/* Hero + Demo (demo ~55–60% width on desktop, centerpiece) */}
      <section className={SECTION_PY} id="hero">
        <div className={CONTAINER}>
          <div className={`${GRID_12}`}>
            <div className={COL_5}>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight text-foreground leading-[1.08]">
                Scanner-proof links.
                <br />
                Human click receipts.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Suqram runs at the edge so only an interactive click redeems. Preview bots fetch the page; tokens stay valid until a human clicks.
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
                For login, verify, reset, and invite links. No SDK.
              </p>
            </div>
            <div className={`${COL_7} hero-demo-wrap`}>
              <ScannerDemo />
            </div>
          </div>
        </div>
      </section>

      {/* What happens on a click */}
      <Section
        id="what-happens"
        title="What happens on a click"
        subtext="Two paths: preview fetch is view-only; human click redeems and produces a signed receipt."
      >
        <div className={GRID_12}>
          <div className={COL_5}>
            <ul className="space-y-3 text-base text-muted-foreground leading-relaxed">
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0" aria-hidden>•</span>
                <span>Scanner or bot fetches the link page → Suqram returns a view-only response. Token is not consumed.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0" aria-hidden>•</span>
                <span>Human clicks the link → Suqram records a signed receipt and redeems the token. Your app gets the redemption.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0" aria-hidden>•</span>
                <span>Every redemption is a ReceiptClicked event with proof (EIG-signed). Use it for audit or downstream workflows.</span>
              </li>
            </ul>
          </div>
          <div className={`${COL_7} min-w-0`}>
            <EventTraceCard />
          </div>
        </div>
      </Section>

      {/* Install in minutes */}
      <Section
        id="install"
        title="Install in minutes"
        subtext="CNAME, swap links, optional destination."
      >
        <div className={GRID_12}>
          <div className={COL_5}>
            <InstallSteps />
          </div>
          <div className={`${COL_7} min-w-0`}>
            <DnsStatusCard />
          </div>
        </div>
        <div className="mt-12">
          <Button asChild size="lg" className="rounded-full h-12 px-8 font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/start">Get started</Link>
          </Button>
        </div>
      </Section>

      {/* Pricing anchor */}
      <section className={SECTION_PY} id="pricing">
        <div className={CONTAINER}>
          <p className="text-sm text-muted-foreground">
            Free tier: 1K redemptions/month. <Link href="/pricing" className="text-primary hover:underline">Pricing</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
