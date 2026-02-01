import type { Metadata } from "next";
import Link from "next/link";
import ScannerDemo from "./components/ScannerDemo";
import ReceiptPanel from "./components/ReceiptPanel";
import GuaranteesGrid from "./components/GuaranteesGrid";
import InstallSteps from "./components/InstallSteps";
import DnsStatusCard from "./components/DnsStatusCard";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Suqram — Scanner-safe auth links",
  description:
    "Scanner-proof links and human click receipts. EIG. Prevent preview bots from triggering your auth workflows.",
};

const CONTAINER = "mx-auto w-full max-w-[1200px] px-6 sm:px-8";
const SECTION_PY = "py-16 sm:py-20 lg:py-24";

export default function HomePage() {
  return (
    <>
      {/* A) Hero + Demo */}
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
            <div className="flex justify-center lg:justify-end">
              <ScannerDemo />
            </div>
          </div>
        </div>
      </section>

      {/* B) What actually happens */}
      <section className={SECTION_PY} id="what-happens">
        <div className={CONTAINER}>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-10">
            What actually happens
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
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
            <div className="w-full max-w-[400px] lg:max-w-none lg:min-w-0">
              <ReceiptPanel />
            </div>
          </div>
        </div>
      </section>

      {/* C) Deterministic guarantees */}
      <section className={SECTION_PY} id="guarantees">
        <div className={CONTAINER}>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-10">
            Deterministic guarantees
          </h2>
          <GuaranteesGrid />
        </div>
      </section>

      {/* D) How to install */}
      <section className={SECTION_PY} id="install">
        <div className={CONTAINER}>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-10">
            How to install
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <InstallSteps />
            <div className="w-full max-w-[340px] lg:max-w-none lg:min-w-0">
              <DnsStatusCard />
            </div>
          </div>
          <div className="mt-12">
            <Button asChild size="lg" className="rounded-full h-12 px-8 font-medium bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/start">Get started</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing anchor for nav */}
      <section className="py-12" id="pricing">
        <div className={CONTAINER}>
          <p className="text-sm text-muted-foreground">
            Free tier: 1K redemptions/month. <Link href="/pricing" className="text-primary hover:underline">Pricing</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
