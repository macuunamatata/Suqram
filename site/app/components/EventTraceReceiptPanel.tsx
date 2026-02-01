export default function EventTraceReceiptPanel() {
  return (
    <div className="product-panel">
      <div className="product-panel__header">
        <span className="product-panel__title">Event trace + receipt</span>
      </div>
      <div className="product-panel__body font-mono text-xs">
        <div className="product-panel__trace-row">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-muted-foreground">preview_bot GET /r/lnk_xxx</span>
            <span className="text-[11px] text-muted-foreground/90">(token unchanged)</span>
          </div>
          <span className="product-panel__badge product-panel__badge--ignored ml-auto shrink-0">IGNORED</span>
        </div>
        <div className="product-panel__trace-row">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-foreground">human_click POST /redeem</span>
            <span className="text-[11px] text-muted-foreground/90">(receipt minted)</span>
          </div>
          <span className="product-panel__badge product-panel__badge--redeemed ml-auto shrink-0">REDEEMED</span>
        </div>
        <div className="product-panel__trace-row">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-muted-foreground">replay GET /redeem</span>
            <span className="text-[11px] text-muted-foreground/90">(already redeemed)</span>
          </div>
          <span className="product-panel__badge product-panel__badge--blocked ml-auto shrink-0">BLOCKED</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">ReceiptClicked</p>
        <div className="product-panel__mini">
          <pre className="product-panel__snippet text-[11px]">{`receipt_id: "rcpt_1a2b3c"
link_id: "lnk_xyz789"
redeemed_at: "2025-02-01T14:32:01Z"
outcome: "REDEEMED"
proof: "turnstile"
sig: "ed25519"`}</pre>
        </div>
      </div>
    </div>
  );
}
