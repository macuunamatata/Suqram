export default function NoSdkDiagram() {
  return (
    <svg
      viewBox="0 0 280 160"
      className="w-full max-w-[280px] h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <marker id="arrow-ns" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" className="text-muted-foreground/70" />
        </marker>
      </defs>
      <path d="M84 80 L98 80" markerEnd="url(#arrow-ns)" stroke="currentColor" strokeWidth="1.2" className="text-muted-foreground/80" strokeLinecap="round" />
      <path d="M174 80 L188 80" markerEnd="url(#arrow-ns)" stroke="currentColor" strokeWidth="1.2" className="text-muted-foreground/80" strokeLinecap="round" />
      <rect x="8" y="56" width="76" height="48" rx="6" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/90" fill="none" />
      <text x="46" y="72" textAnchor="middle" fill="currentColor" className="text-[10px] font-medium text-foreground" style={{ fontFamily: "inherit" }}>Your links domain</text>
      <text x="46" y="86" textAnchor="middle" fill="currentColor" className="text-[10px] text-muted-foreground" style={{ fontFamily: "inherit" }}>(CNAME)</text>
      <rect x="98" y="56" width="76" height="48" rx="6" stroke="currentColor" strokeWidth="1" className="text-primary" fill="none" />
      <text x="136" y="72" textAnchor="middle" fill="currentColor" className="text-[10px] font-medium text-primary" style={{ fontFamily: "inherit" }}>Suqram rail</text>
      <rect x="188" y="56" width="76" height="48" rx="6" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" fill="none" />
      <text x="226" y="80" textAnchor="middle" fill="currentColor" className="text-[10px] font-medium text-foreground" style={{ fontFamily: "inherit" }}>Your app</text>
    </svg>
  );
}
