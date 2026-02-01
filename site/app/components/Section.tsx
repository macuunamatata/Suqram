import { type ReactNode } from "react";

const CONTAINER = "mx-auto w-full max-w-6xl px-6 sm:px-8";
const SECTION_PY = "py-14 sm:py-20";
const H2_CLASS = "text-2xl sm:text-3xl font-semibold tracking-tight text-foreground";
const SUBTEXT_CLASS = "mt-2 text-base text-muted-foreground leading-relaxed max-w-2xl";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  subtext?: string;
  children: ReactNode;
};

export default function Section({ id, eyebrow, title, subtext, children }: SectionProps) {
  return (
    <section className={SECTION_PY} id={id}>
      <div className={CONTAINER}>
        <header className="mb-10">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
              {eyebrow}
            </p>
          )}
          <h2 className={H2_CLASS}>{title}</h2>
          {subtext && <p className={SUBTEXT_CLASS}>{subtext}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

export { CONTAINER, SECTION_PY, H2_CLASS, SUBTEXT_CLASS };
