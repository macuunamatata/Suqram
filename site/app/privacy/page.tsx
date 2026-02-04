import type { Metadata } from "next";

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Privacy Policy — Auth Link Rail",
  description: "Privacy Policy for Auth Link Rail.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">Privacy Policy</h1>
      <p className="mt-4 text-[var(--muted)]">
        This page is a placeholder. Replace with your privacy policy when you go to production.
      </p>
    </div>
  );
}
