import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Suqram — Protocol-grade auth links",
  description:
    "View-safe, exactly-once redemption. Magic links that survive scanners. Dev infra for auth links.",
  openGraph: {
    title: "Suqram — Protocol-grade auth links",
    description:
      "View-safe, exactly-once redemption. Magic links that survive scanners. Dev infra for auth links.",
    type: "website",
  },
};

const CENTER_NAV = [
  { href: "#invariants", label: "Invariants" },
  { href: "#demo", label: "Demo" },
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} scroll-smooth`}>
      <body className="relative min-h-screen flex flex-col antialiased font-sans">
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
            <a
              href="/"
              className="text-base font-semibold text-[var(--text)] shrink-0 whitespace-nowrap"
            >
              Suqram
            </a>
            <nav className="hidden sm:flex items-center gap-6 flex-1 min-w-0 px-6" aria-label="Main">
              {CENTER_NAV.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2 shrink-0">
              <a href="#demo" className="btn-nav-cta">
                Demo
              </a>
              <a href="/app" className="btn-nav-cta">
                Dashboard
              </a>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] py-6 bg-[var(--surface)]">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-[var(--text-secondary)]">
                Suqram — Protocol-grade auth links.
              </p>
              <div className="flex items-center gap-6 flex-wrap justify-center">
                {FOOTER_LINKS.map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
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
