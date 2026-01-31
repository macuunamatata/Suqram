-- Live Test: simulate scanner flow (demo without email).
-- Run: wrangler d1 execute eig-db --file=migrations/0002_live_test_simulate.sql --remote

ALTER TABLE live_tests ADD COLUMN normal_link TEXT;
ALTER TABLE live_tests ADD COLUMN protected_link TEXT;
ALTER TABLE live_tests ADD COLUMN normal_scanner_seen_at INTEGER;
ALTER TABLE live_tests ADD COLUMN protected_scanner_seen_at INTEGER;
ALTER TABLE live_tests ADD COLUMN protected_redeemed_at INTEGER;
