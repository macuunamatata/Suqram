const CARDS = [
  {
    title: "View-safe",
    subtitle: "Scanners don't redeem",
    bullets: [
      "Link page fetch returns view-only response.",
      "Token remains valid until interactive redemption.",
    ],
    snippet: (
      <pre className="product-panel__snippet">
{`GET /r/lnk_xxx
User-Agent: ScannerBot/1.0
→ outcome: IGNORED
→ token: unchanged`}
      </pre>
    ),
  },
  {
    title: "Exactly-once",
    subtitle: "One redemption per link",
    bullets: [
      "First successful click redeems; replays blocked.",
      "Duplicate requests detected and deduplicated.",
    ],
    snippet: (
      <pre className="product-panel__snippet">
{`state: fresh → redeemed
replay: BLOCKED
dup_request: deduped`}
      </pre>
    ),
  },
  {
    title: "Drop-in",
    subtitle: "Domain CNAME, no SDK",
    bullets: [
      "Point your link domain at the Suqram rail.",
      "Swap URL in email templates; no code changes.",
    ],
    snippet: (
      <pre className="product-panel__snippet">
{`CNAME go.company.com
  → rail.suqram.com
links: paste rail URL`}
      </pre>
    ),
  },
];

export default function GuaranteesGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {CARDS.map(({ title, subtitle, bullets, snippet }) => (
        <div key={title} className="product-panel product-panel--card">
          <div className="product-panel__header">
            <span className="product-panel__title">{title}</span>
            <span className="text-xs font-medium text-muted-foreground">{subtitle}</span>
          </div>
          <ul className="product-panel__bullets">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className="product-panel__mini">
            {snippet}
          </div>
        </div>
      ))}
    </div>
  );
}
