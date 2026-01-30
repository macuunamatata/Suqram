import type { ReactNode } from "react";

type IconBadgeProps = {
  children: ReactNode;
  /** Accent highlight (green) for selected icons */
  accent?: boolean;
  className?: string;
};

export default function IconBadge({
  children,
  accent = false,
  className = "",
}: IconBadgeProps) {
  return (
    <span
      className={`icon-badge shrink-0 ${accent ? "icon-badge-accent" : ""} ${className}`.trim()}
      aria-hidden
    >
      {children}
    </span>
  );
}
