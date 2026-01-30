import type { Metadata } from "next";
import "./globals.css";
import { REPO_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Auth Link Rail — Magic links that work in every inbox",
  description:
    "Password reset, magic links, and invite links that work even in corporate email. One click for users. Scanners never consume your tokens.",
  openGraph: {
    title: "Auth Link Rail — Magic links that work in every inbox",
    description:
      "Password reset, magic links, and invite links that work even in corporate email. One click for users.",
    type: "website",
  },
};

const NAV_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: REPO_URL, label: "GitHub", external: true },
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
      <body className="relative z-10 min-h-screen flex flex-col antialiased">
        <header
          className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--bg)]/70"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6">
            <a
              href="/"
              className="text-lg font-semibold text-[var(--text)] transition-opacity hover:opacity-90"
            >
              Auth Link Rail
            </a>
            <nav className="flex items-center gap-8">
              {NAV_LINKS.map(({ href, label, external }) => (
                <a
                  key={href}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                >
                  {label}
                </a>
              ))}
              <a href="/start" className="btn-primary text-sm py-2.5 px-5">
                Start free
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer
          className="border-t border-[var(--border)] py-10"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {FOOTER_LINKS.map(({ href, label, external }) => (
                  <a
                    key={href}
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="text-xs text-[var(--muted)] transition-colors hover:text-[var(--text)]"
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
