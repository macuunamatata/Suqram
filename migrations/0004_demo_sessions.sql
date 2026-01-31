CREATE TABLE IF NOT EXISTS demo_sessions (
  tid TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  unprotected_scanned_count INTEGER NOT NULL DEFAULT 0,
  protected_scanned_count INTEGER NOT NULL DEFAULT 0,
  unprotected_consumed_at INTEGER,
  protected_consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_created_at ON demo_sessions(created_at);
