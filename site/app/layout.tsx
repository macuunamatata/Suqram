import type { Metadata } from "next";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Button } from "@/components/ui/button";

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
  title: "Suqram — Scanner-safe auth links",
  description:
    "Scanner-proof links and human click receipts. Prevent preview bots from triggering your auth workflows.",
  openGraph: {
    title: "Suqram — Scanner-safe auth links",
    description:
      "Scanner-proof links and human click receipts. Prevent preview bots from triggering your auth workflows.",
    type: "website",
  },
};

const NAV_LINKS = [
  { href: "#features", label: "Product" },
  { href: "/docs", label: "Docs" },
  { href: "#pricing", label: "Pricing" },
];

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "/docs", label: "Docs" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "mailto:support@suqram.com", label: "Contact" },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} scroll-smooth`}>
      <body className="home-body relative min-h-screen flex flex-col antialiased font-sans">
        <a href="#announcement" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-foreground focus:text-background">
          Skip to content
        </a>
        <div className="announcement-bar" id="announcement">
          <Link href="/docs" className="announcement-bar__text">
            Scanner-safe links are live. Set up in under 10 minutes.
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
        <header className="site-header">
          <div className="site-header__inner">
            <Link href="/" className="site-header__logo">
              Suqram
            </Link>
            <nav className="site-header__nav" aria-label="Main">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="site-header__link">
                  {label}
                </Link>
              ))}
            </nav>
            <div className="site-header__actions">
              <Link href="/app" className="site-header__link site-header__link--log">
                Log in
              </Link>
              <Button asChild size="sm" className="site-btn site-btn--primary">
                <Link href="/start">Get started</Link>
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="site-footer">
          <div className="site-footer__inner">
            <div className="site-footer__grid">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title} className="site-footer__col">
                  <h3 className="site-footer__col-title">{col.title}</h3>
                  <ul className="site-footer__links">
                    {col.links.map(({ href, label }) => (
                      <li key={label}>
                        <Link href={href} className="site-footer__link">
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="site-footer__copy">
              © {new Date().getFullYear()} Suqram. Scanner-safe links for auth.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
