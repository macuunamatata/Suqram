"use client";

import { useState } from "react";

export type FAQItem = { q: string; a: string };

export default function HomeFAQ({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="card overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-[var(--text)] hover:bg-[var(--bg2)]/50 transition-colors"
            aria-expanded={openIndex === i}
          >
            <span>{item.q}</span>
            <span
              className={`shrink-0 text-[var(--muted)] transition-transform ${openIndex === i ? "rotate-180" : ""}`}
              aria-hidden
            >
              ▼
            </span>
          </button>
          {openIndex === i && (
            <div className="border-t border-[var(--border)] px-5 py-4 text-sm text-[var(--muted)]">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
