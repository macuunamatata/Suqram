import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suqram — Scanner-proof auth links",
  description:
    "Magic links that survive Safe Links and security scanners. Suqram Auth Link Rail.",
  openGraph: {
    title: "Suqram — Scanner-proof auth links",
    description:
      "Magic links that survive Safe Links and security scanners. Suqram Auth Link Rail.",
    type: "website",
  },
};

const CENTER_NAV = [
  { href: "#how", label: "How it works" },
  { href: "#quickstart", label: "Quickstart" },
  { href: "/pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const FOOTER_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "mailto:support@suqram.com", label: "Contact" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="relative z-10 min-h-screen flex flex-col antialiased">
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
            <a
              href="/"
              className="text-lg font-semibold text-[var(--text)] transition-opacity hover:opacity-90 shrink-0 whitespace-nowrap"
            >
              Suqram
            </a>
            <nav className="hidden sm:flex items-center justify-center gap-6 md:gap-8 flex-1 min-w-0 px-4" aria-label="Main">
              {CENTER_NAV.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm text-[var(--text)] transition-colors duration-150 ease-out hover:text-[var(--text)] opacity-90 hover:opacity-100"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3 shrink-0">
              <a href="#demo" className="btn-nav-cta">
                Try the demo
              </a>
              <a href="/app" className="btn-nav-cta">
                Dashboard
              </a>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] py-8 bg-[var(--bg)]">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-[var(--text)]">
                Suqram — Scanner-proof magic links.
              </p>
              <div className="flex items-center gap-4 flex-wrap justify-center">
                {FOOTER_LINKS.map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    className="text-xs text-[var(--muted)] transition-colors duration-150 ease-out hover:text-[var(--text)]"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
