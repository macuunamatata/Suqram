export default function EventTraceCard() {
  return (
    <div className="product-panel">
      <div className="product-panel__header">
        <span className="product-panel__title">Event trace</span>
      </div>
      <div className="product-panel__body font-mono text-xs">
        <div className="product-panel__trace-row">
          <span className="text-muted-foreground shrink-0 w-32">preview_bot fetch</span>
          <span className="text-muted-foreground shrink-0">2025-02-01T14:31:59Z</span>
          <span className="product-panel__badge product-panel__badge--ignored ml-auto">IGNORED</span>
        </div>
        <div className="product-panel__trace-row">
          <span className="text-foreground shrink-0 w-32">human click</span>
          <span className="text-muted-foreground shrink-0">2025-02-01T14:32:01Z</span>
          <span className="product-panel__badge product-panel__badge--redeemed ml-auto">REDEEMED</span>
        </div>
      </div>
    </div>
  );
}
