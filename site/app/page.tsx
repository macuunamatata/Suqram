export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-24 sm:pb-20">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Your magic links always work — even in corporate inboxes.
          </h1>
          <p className="mt-6 text-lg text-slate-600 sm:text-xl max-w-2xl mx-auto">
            Outlook, Defender, Safe Links, and other email scanners can&apos;t consume your
            one-time links. Users click once and land where you sent them. Fewer &quot;link
            already used&quot; errors, fewer support tickets.
          </p>
          <p className="mt-4 text-base font-medium text-slate-700">
            Fewer expired links. Fewer support tickets. Higher signup completion.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/start"
              className="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors sm:w-auto"
            >
              Start free
            </a>
            <a
              href="/docs"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors sm:w-auto"
            >
              Read docs
            </a>
          </div>
          <ul className="mt-12 flex flex-col gap-3 text-left sm:mx-auto sm:max-w-md sm:text-center">
            {[
              "Fewer invalid or expired link errors",
              "Fewer support tickets about broken links",
              "Higher signup and reset completion",
            ].map((text) => (
              <li key={text} className="flex items-center gap-2 text-slate-600 sm:justify-center">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-b border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-slate-500">
            <span>Built for indie SaaS</span>
            <span>Supabase-first</span>
            <span>Bring your own auth</span>
          </div>
        </div>
      </section>

      {/* How it helps — 3 cards */}
      <section className="border-b border-slate-200 bg-slate-50/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            How it helps
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
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
              <div
                key={title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Works with */}
      <section className="border-b border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Works with
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-600">
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 font-medium">
              Supabase
            </span>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 font-medium opacity-80">
              NextAuth / Auth.js (coming)
            </span>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 font-medium">
              Any auth provider
            </span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-slate-200 bg-slate-50/50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Frequently asked questions
          </h2>
          <dl className="mt-12 space-y-8">
            {[
              {
                q: "Does it add an extra click?",
                a: "No. For normal users it’s one click: they open the link and are redirected. No extra step.",
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
                a: "Minimal, privacy-safe data: no full URLs, no tracking. We store only what’s needed to run the rail (e.g. host and path length, not the full destination).",
              },
              {
                q: "Can I start free?",
                a: "Yes. There’s a free tier with a monthly allowance. You only pay for successful redemptions after that.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <dt className="text-base font-semibold text-slate-900">{q}</dt>
                <dd className="mt-2 text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
          <section className="bg-slate-900 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Magic links that work everywhere
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Start free. No credit card. Deploy in minutes.
          </p>
          <a
            href="/start"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-sky-500 px-6 py-3 text-base font-semibold text-white hover:bg-sky-600 transition-colors"
          >
            Start free
          </a>
        </div>
      </section>
    </>
  );
}
