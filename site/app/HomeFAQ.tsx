"use client";

import { useState } from "react";
import { IconChevronDown } from "./components/icons";

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
            className="transition-ui flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium text-[var(--text)] hover:bg-[rgba(255,255,255,0.03)] rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            aria-expanded={openIndex === i}
          >
            <span>{item.q}</span>
            <span
              className={`transition-ui shrink-0 text-[var(--text-muted)] ${openIndex === i ? "rotate-180" : ""}`}
              aria-hidden
            >
              <IconChevronDown />
            </span>
          </button>
          {openIndex === i && (
            <div className="border-t border-[var(--border)] px-5 py-4 text-sm body-text">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
