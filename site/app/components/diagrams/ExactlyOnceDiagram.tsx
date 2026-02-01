export default function ExactlyOnceDiagram() {
  return (
    <svg
      viewBox="0 0 280 160"
      className="w-full max-w-[280px] h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <marker id="arrow-eo" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" className="text-muted-foreground/70" />
        </marker>
      </defs>
      <g stroke="currentColor" strokeWidth="1.2" className="text-muted-foreground/80" strokeLinecap="round">
        <path d="M50 40 L90 40 L90 80" markerEnd="url(#arrow-eo)" />
        <path d="M90 80 L90 120 L50 120" markerEnd="url(#arrow-eo)" />
        <path d="M50 120 L50 80 L50 40" markerEnd="url(#arrow-eo)" />
      </g>
      <circle cx="50" cy="40" r="18" stroke="currentColor" strokeWidth="1" className="text-primary" fill="none" />
      <text x="50" y="44" textAnchor="middle" fill="currentColor" className="text-[10px] font-medium text-primary" style={{ fontFamily: "inherit" }}>fresh</text>
      <circle cx="90" cy="80" r="18" stroke="currentColor" strokeWidth="1" className="text-primary" fill="none" />
      <text x="90" y="84" textAnchor="middle" fill="currentColor" className="text-[10px] font-medium text-primary" style={{ fontFamily: "inherit" }}>redeemed</text>
      <circle cx="50" cy="120" r="18" stroke="currentColor" strokeWidth="1" className="text-destructive/90" fill="none" />
      <text x="50" y="124" textAnchor="middle" fill="currentColor" className="text-[10px] font-medium text-destructive" style={{ fontFamily: "inherit" }}>replay blocked</text>
      <rect x="140" y="20" width="120" height="48" rx="6" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/90" fill="none" />
      <text x="150" y="38" fill="currentColor" className="text-[10px] font-medium text-foreground" style={{ fontFamily: "inherit" }}>Duplicate request</text>
      <text x="150" y="52" fill="currentColor" className="text-[10px] text-muted-foreground" style={{ fontFamily: "inherit" }}>detection</text>
    </svg>
  );
}
