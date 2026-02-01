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
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
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
        <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-8 px-6 sm:px-8">
            <a
              href="/"
              className="text-lg font-semibold text-foreground shrink-0 whitespace-nowrap"
            >
              Suqram
            </a>
            <nav className="hidden sm:flex items-center gap-8 flex-1 min-w-0 justify-center" aria-label="Main">
              {CENTER_NAV.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center shrink-0">
              <Button asChild size="sm" className="h-9 px-4">
                <Link href="#demo">Try the demo</Link>
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border/60 py-8 bg-background/50">
          <div className="mx-auto max-w-[1200px] px-6 sm:px-8">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Suqram — Protocol-grade auth links.
              </p>
              <div className="flex flex-wrap gap-8 justify-center">
                {FOOTER_LINKS.map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
