export default function DnsStatusCard() {
  return (
    <div className="product-panel">
      <div className="product-panel__header">
        <span className="product-panel__title">DNS + status</span>
      </div>
      <div className="product-panel__body font-mono text-xs">
        <div className="product-panel__row">
          <span className="text-muted-foreground">domain</span>
          <span>go.company.com</span>
        </div>
        <div className="product-panel__row">
          <span className="text-muted-foreground">status</span>
          <span className="product-panel__badge product-panel__badge--valid">Verified</span>
        </div>
        <div className="product-panel__row">
          <span className="text-muted-foreground">last_check</span>
          <span>2025-02-01T14:30Z</span>
        </div>
        <div className="product-panel__row">
          <span className="text-muted-foreground">ssl</span>
          <span className="product-panel__badge product-panel__badge--ok">ready</span>
        </div>
      </div>
    </div>
  );
}
