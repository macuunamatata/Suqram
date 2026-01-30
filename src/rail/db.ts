// Rail D1 helpers: telemetry_events, redemption_ledger (no PII, no full URL — only dst_host, dst_path_len, dst_hash)

export type TelemetryKind = 'entry_issued' | 'redeemed' | 'fallback_shown' | 'redeem_denied';

export interface DstMeta {
  dst_host: string;
  dst_path_len: number;
  dst_hash: string;
}

export async function insertTelemetry(
  db: D1Database,
  rid: string,
  kind: TelemetryKind,
  reason?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const ts = Date.now();
  const metaJson = meta ? JSON.stringify(meta) : null;
  await db.prepare(
    `INSERT INTO telemetry_events (ts, rid, kind, reason, meta_json) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(ts, rid, kind, reason ?? null, metaJson)
    .run();
}

export async function insertRedemptionLedger(
  db: D1Database,
  rid: string,
  issuedAt: number,
  redeemedAt: number | null,
  decision: 'issued' | 'redeemed' | 'denied',
  reason?: string,
  dst?: DstMeta
): Promise<void> {
  await db.prepare(
    `INSERT INTO redemption_ledger (rid, issued_at, redeemed_at, decision, reason, dst_host, dst_path_len, dst_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      rid,
      issuedAt,
      redeemedAt,
      decision,
      reason ?? null,
      dst?.dst_host ?? null,
      dst?.dst_path_len ?? null,
      dst?.dst_hash ?? null
    )
    .run();
}

export async function countRedemptionsByRid(db: D1Database, rid: string): Promise<number> {
  const r = await db.prepare(
    `SELECT COUNT(*) as c FROM redemption_ledger WHERE rid = ? AND decision = 'redeemed'`
  )
    .bind(rid)
    .first<{ c: number }>();
  return r?.c ?? 0;
}
