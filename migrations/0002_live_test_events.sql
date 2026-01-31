-- Live Test: event log for simulate/scanner/human.
-- Run: wrangler d1 execute EIG_DB --remote --file ./migrations/0002_live_test_events.sql

DROP TABLE IF EXISTS live_test_events;

CREATE TABLE live_test_events (
  id TEXT PRIMARY KEY,
  tid TEXT NOT NULL,
  variant TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  meta TEXT
);

CREATE INDEX idx_live_test_events_tid_created ON live_test_events(tid, created_at);
CREATE INDEX idx_live_test_events_kind_created ON live_test_events(kind, created_at);
