import type { Metadata } from "next";
import "./globals.css";
import { REPO_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Auth Link Rail — Auth links that don't break in corporate inboxes",
  description:
    "Send yourself a test email. If your auth links break in corporate inboxes, you'll see it in 60 seconds.",
  openGraph: {
    title: "Auth Link Rail — Auth links that don't break in corporate inboxes",
    description:
      "Send yourself a test email. If your auth links break in corporate inboxes, you'll see it in 60 seconds.",
    type: "website",
  },
};

const CENTER_NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

const FOOTER_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: REPO_URL, label: "GitHub", external: true },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="relative z-10 min-h-screen flex flex-col antialiased bg-[var(--bg)]">
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--panel)]/90">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
            <a
              href="/"
              className="text-lg font-semibold text-[var(--text)] transition-opacity hover:opacity-90 shrink-0"
            >
              Auth Link Rail
            </a>
            <nav className="hidden sm:flex items-center justify-center gap-6 md:gap-8 flex-1 min-w-0 px-4" aria-label="Main">
              {CENTER_NAV.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm text-[var(--muted)] transition-colors duration-150 ease-out hover:text-[var(--text)]"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href="/start"
                className="btn-ghost hidden sm:inline-flex text-sm py-2.5 px-4 min-h-0 h-10"
              >
                Log in
              </a>
              <a href="/start" className="btn-nav-cta">
                Integrate
              </a>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="section-border py-10 bg-[var(--panel)]">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {FOOTER_LINKS.map(({ href, label, external }) => (
                  <a
                    key={href}
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="text-xs text-[var(--muted)] transition-colors duration-150 ease-out hover:text-[var(--text)]"
                  >
                    {label}
                  </a>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)]">
                © {new Date().getFullYear()} Auth Link Rail
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
