import type { ReactNode } from "react";

type SectionProps = {
  id?: string;
  children: ReactNode;
  /** Add subtle teal ambient glow behind section content (< 6% opacity) */
  glow?: "teal" | "none";
  /** Extra class for container (e.g. CONTAINER) — Section handles padding/fade only */
  className?: string;
  /** Use for sections that need a wrapper with max-width (e.g. CONTAINER) */
  containerClassName?: string;
};

export default function Section({
  id,
  children,
  glow = "none",
  className = "",
  containerClassName = "",
}: SectionProps) {
  const fadeClass = "section-fade";
  const glowClass = glow === "teal" ? "glow-teal" : "";
  return (
    <section
      id={id}
      className={`${fadeClass} ${glowClass} ${className}`.trim()}
    >
      {containerClassName ? (
        <div className={containerClassName}>{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
