-- Live Inbox Test: non-destructive migration for live_tests.
-- Run: wrangler d1 execute eig-db --file=migrations/0001_live_tests.sql --remote

CREATE TABLE IF NOT EXISTS live_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  email TEXT,
  email_hash TEXT NOT NULL,
  creator_ip_hash TEXT NOT NULL,
  status TEXT,
  detail TEXT,
  tid TEXT NOT NULL,
  protected_rid TEXT NOT NULL,
  control_token_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_tests_email_hash ON live_tests(email_hash);
CREATE INDEX IF NOT EXISTS idx_live_tests_created ON live_tests(created_at);
CREATE INDEX IF NOT EXISTS idx_live_tests_ip ON live_tests(creator_ip_hash);
