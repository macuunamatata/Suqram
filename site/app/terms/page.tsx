import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Auth Link Rail",
  description: "Terms of Service for Auth Link Rail.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">Terms of Service</h1>
      <p className="mt-4 text-[var(--muted)]">
        This page is a placeholder. Replace with your terms of service when you go to production.
      </p>
    </div>
  );
}
