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
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <a href="/" className="text-lg font-semibold text-slate-900">
              Auth Link Rail
            </a>
            <nav className="flex items-center gap-6">
              {NAV_LINKS.map(({ href, label, external }) => (
                <a
                  key={href}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {label}
                </a>
              ))}
              <a
                href="/start"
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
              >
                Start free
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-slate-50/50">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {FOOTER_LINKS.map(({ href, label, external }) => (
                  <a
                    key={href}
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} Auth Link Rail. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
