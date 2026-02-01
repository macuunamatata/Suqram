export default function ReceiptPanel() {
  return (
    <div className="product-panel">
      <div className="product-panel__header">
        <span className="product-panel__title">ReceiptClicked</span>
        <span className="product-panel__badge product-panel__badge--valid">VALID</span>
      </div>
      <div className="product-panel__body font-mono text-xs text-foreground/90">
        <div className="product-panel__row">
          <span className="text-muted-foreground">receipt_id</span>
          <span>rcpt_8f2a1b3c4d5e</span>
        </div>
        <div className="product-panel__row">
          <span className="text-muted-foreground">timestamp</span>
          <span>2025-02-01T14:32:01Z</span>
        </div>
        <div className="product-panel__row">
          <span className="text-muted-foreground">link_id</span>
          <span>lnk_7e9d2f...</span>
        </div>
        <div className="product-panel__row">
          <span className="text-muted-foreground">outcome</span>
          <span className="product-panel__badge product-panel__badge--redeemed">REDEEMED</span>
        </div>
        <div className="product-panel__row">
          <span className="text-muted-foreground">actor</span>
          <span>human_click</span>
        </div>
        <div className="product-panel__row">
          <span className="text-muted-foreground">proof</span>
          <span>EIG-signed</span>
        </div>
      </div>
      <div className="product-panel__timeline">
        <div className="product-panel__timeline-row">
          <span className="product-panel__timeline-dot product-panel__timeline-dot--muted" aria-hidden />
          <span className="text-muted-foreground">scanner_fetch:</span>
          <span className="product-panel__badge product-panel__badge--ignored">IGNORED</span>
        </div>
        <div className="product-panel__timeline-row">
          <span className="product-panel__timeline-dot product-panel__timeline-dot--ok" aria-hidden />
          <span className="text-muted-foreground">human_click:</span>
          <span className="product-panel__badge product-panel__badge--redeemed">REDEEMED</span>
        </div>
      </div>
    </div>
  );
}
