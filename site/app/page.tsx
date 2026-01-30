export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:pt-24 sm:pb-20">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl">
              Your magic links always work — even in corporate inboxes.
            </h1>
            <p className="mt-6 text-lg text-[var(--muted)] sm:text-xl">
              Outlook, Defender, Safe Links, and other email scanners can&apos;t consume your
              one-time links. Users click once and land where you sent them.
            </p>
            <p className="mt-4 text-base font-medium text-[var(--text)]">
              Fewer expired links. Fewer support tickets. Higher signup completion.
            </p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
              <a href="/start" className="btn-primary w-full sm:w-auto">
                Start free
              </a>
              <a href="/docs" className="btn-secondary w-full sm:w-auto">
                Read docs
              </a>
            </div>
            {/* Proof strip: 3 outcomes with icons */}
            <ul className="mt-14 flex flex-col gap-4 sm:flex-row sm:gap-8">
              {[
                "Fewer invalid or expired link errors",
                "Fewer support tickets about broken links",
                "Higher signup and reset completion",
              ].map((text) => (
                <li
                  key={text}
                  className="flex items-center gap-3 text-sm text-[var(--muted)]"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
                    aria-hidden
                  />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          {/* Optional product frame mock (pure divs) */}
          <div className="mt-16 hidden lg:block">
            <div className="card card-gradient-top overflow-hidden p-1">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6">
                <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
                  <span className="h-2 w-2 rounded-full bg-[var(--muted-strong)]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--muted-strong)]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--muted-strong)]" />
                </div>
                <div className="mt-4 space-y-3">
                  <div className="h-3 w-3/4 rounded bg-[var(--panel)]" />
                  <div className="h-3 w-full rounded bg-[var(--panel)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--panel)]" />
                </div>
                <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
                  <div className="h-2 w-full rounded bg-[var(--muted-strong)]/30" />
                  <div className="mt-2 h-2 w-2/3 rounded bg-[var(--accent)]/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-t border-[var(--border)] py-8" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--muted)]">
            <span className="pill">Built for indie SaaS</span>
            <span className="pill">Supabase-first</span>
            <span className="pill">Bring your own auth</span>
          </div>
        </div>
      </section>

      {/* How it helps — 3 cards */}
      <section className="border-t border-[var(--border)] py-20 sm:py-24" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            How it helps
          </h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Stop expired links",
                body: "Email scanners that open links no longer burn your one-time tokens. Only real user clicks count.",
              },
              {
                title: "Reduce support",
                body: "Fewer &quot;this link doesn&apos;t work&quot; tickets. Users get where they need to go the first time.",
              },
              {
                title: "Protect conversion",
                body: "Signup, password reset, and invite flows complete instead of failing in corporate inboxes.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="card card-gradient-top p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
                <p className="mt-4 text-[var(--muted)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Works with */}
      <section className="border-t border-[var(--border)] py-20 sm:py-24" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Works with
          </h2>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
            <span className="pill pill-accent">Supabase</span>
            <span className="pill opacity-80">NextAuth / Auth.js (coming)</span>
            <span className="pill">Any auth provider</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--border)] py-20 sm:py-24" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Frequently asked questions
          </h2>
          <dl className="mt-14 max-w-2xl mx-auto space-y-10">
            {[
              {
                q: "Does it add an extra click?",
                a: "No. For normal users it's one click: they open the link and are redirected. No extra step.",
              },
              {
                q: "Will it work in corporate email?",
                a: "Yes. Links are designed to work even when Outlook, Microsoft Defender, Safe Links, or similar tools scan them. Only a real user click completes the flow.",
              },
              {
                q: "Do I need to change my app code?",
                a: "For Supabase: paste a template snippet and set allowed hosts. For other providers: minimal changes — wrap your existing link in ours.",
              },
              {
                q: "What do you store?",
                a: "Minimal, privacy-safe data: no full URLs, no tracking. We store only what's needed to run the rail (e.g. host and path length, not the full destination).",
              },
              {
                q: "Can I start free?",
                a: "Yes. There's a free tier with a monthly allowance. You only pay for successful redemptions after that.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <dt className="text-base font-semibold text-[var(--text)]">{q}</dt>
                <dd className="mt-2 text-[var(--muted)]">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[var(--border)] py-20 sm:py-24" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-[1120px] px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Magic links that work everywhere
          </h2>
          <p className="mt-4 text-lg text-[var(--muted)]">
            Start free. No credit card. Deploy in minutes.
          </p>
          <a href="/start" className="btn-primary mt-8">
            Start free
          </a>
        </div>
      </section>
    </>
  );
}
