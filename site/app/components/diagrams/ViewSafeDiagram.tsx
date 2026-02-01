export default function ViewSafeDiagram() {
  return (
    <svg
      viewBox="0 0 280 160"
      className="w-full max-w-[280px] h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" className="text-muted-foreground/70" />
        </marker>
      </defs>
      <g stroke="currentColor" strokeWidth="1.2" className="text-muted-foreground/80" strokeLinecap="round">
        <path d="M40 30 L40 50 L80 50 L80 70" markerEnd="url(#arrow)" />
        <path d="M140 80 L140 100 L180 100 L180 120" markerEnd="url(#arrow)" />
      </g>
      <rect x="20" y="20" width="44" height="24" rx="4" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/90" fill="none" />
      <text x="42" y="36" fill="currentColor" className="text-[10px] font-medium text-foreground" style={{ fontFamily: "inherit" }}>Preview bot</text>
      <rect x="60" y="60" width="52" height="24" rx="4" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/90" fill="none" />
      <text x="68" y="76" fill="currentColor" className="text-[10px] text-muted-foreground" style={{ fontFamily: "inherit" }}>Link fetch</text>
      <rect x="100" y="100" width="64" height="24" rx="4" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/90" fill="none" />
      <text x="108" y="116" fill="currentColor" className="text-[10px] text-muted-foreground" style={{ fontFamily: "inherit" }}>no redeem</text>
      <rect x="20" y="90" width="44" height="24" rx="4" stroke="currentColor" strokeWidth="1" className="text-primary" fill="none" />
      <text x="28" y="106" fill="currentColor" className="text-[10px] font-medium text-primary" style={{ fontFamily: "inherit" }}>Human click</text>
      <path d="M64 102 L64 120 L120 120 L120 138" markerEnd="url(#arrow)" stroke="currentColor" strokeWidth="1.2" className="text-primary/80" strokeLinecap="round" />
      <rect x="100" y="130" width="48" height="24" rx="4" stroke="currentColor" strokeWidth="1" className="text-primary" fill="none" />
      <text x="112" y="146" fill="currentColor" className="text-[10px] font-medium text-primary" style={{ fontFamily: "inherit" }}>redeem</text>
    </svg>
  );
}
