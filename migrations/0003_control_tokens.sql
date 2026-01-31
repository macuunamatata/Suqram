-- One-time control token consumption (normal/unprotected link).
-- Atomic UPDATE: first request consumes; replay gets 410.

CREATE TABLE IF NOT EXISTS control_tokens (
  tid TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  consumed_at INTEGER,
  consumed_by TEXT
);
