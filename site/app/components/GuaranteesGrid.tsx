const CARDS = [
  {
    label: "VIEW-SAFE",
    title: "Scanners don't redeem",
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
    label: "EXACTLY-ONCE",
    title: "One redemption per link",
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
    label: "NO SDK",
    title: "Domain CNAME, drop-in",
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-stretch">
      {CARDS.map(({ label, title, bullets, snippet }) => (
        <div key={label} className="product-panel product-panel--card flex flex-col">
          <div className="product-panel__header product-panel__header--col">
            <span className="product-panel__badge product-panel__badge--label">{label}</span>
          </div>
          <h3 className="text-base font-semibold tracking-tight text-foreground mt-0 mb-3">{title}</h3>
          <ul className="product-panel__bullets flex-1 min-h-0">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className="product-panel__mini mt-auto pt-4">
            {snippet}
          </div>
        </div>
      ))}
    </div>
  );
}
