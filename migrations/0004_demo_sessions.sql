-- Deterministic two-link demo: unprotected (breaks after scan) vs protected (works after scan).
-- TTL: optional cleanup of old sessions can be done via cron; no schema TTL.

CREATE TABLE IF NOT EXISTS demo_sessions (
  tid TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  unprotected_consumed_at INTEGER,
  protected_scan_count INTEGER NOT NULL DEFAULT 0,
  unprotected_scan_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_created ON demo_sessions(created_at);
