-- EIG V1 Database Schema
-- D1 database for Engagement Integrity Gateway

-- Tenants (organizations using EIG)
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Domains (tracking domains per tenant)
CREATE TABLE IF NOT EXISTS domains (
  domain_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  hostname TEXT NOT NULL UNIQUE,
  policy_template TEXT NOT NULL DEFAULT 'low_friction',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_domains_hostname ON domains(hostname);
CREATE INDEX IF NOT EXISTS idx_domains_tenant ON domains(tenant_id);

-- Links (token -> destination_url mapping)
CREATE TABLE IF NOT EXISTS links (
  link_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  campaign_id TEXT,
  message_id TEXT,
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  hubspot_contact_id TEXT, -- Direct HubSpot contact ID if known
  email TEXT, -- Email for contact resolution (optional, may be encrypted)
  email_hash TEXT, -- SHA256 hash of email for lookup (optional)
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_links_token ON links(token);
CREATE INDEX IF NOT EXISTS idx_links_tenant ON links(tenant_id);

-- Attestations ledger (issued/denied records)
CREATE TABLE IF NOT EXISTS attestations (
  event_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  token TEXT NOT NULL,
  nonce TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'issued' or 'denied'
  reason_code TEXT, -- null if issued, error code if denied
  destination_url TEXT,
  subject_hash TEXT,
  continuity_hash TEXT, -- Hash of IP+UA for replay detection
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
  UNIQUE(tenant_id, event_id) -- Prevent duplicate event_ids per tenant
);

CREATE INDEX IF NOT EXISTS idx_attestations_token ON attestations(token);
CREATE INDEX IF NOT EXISTS idx_attestations_tenant ON attestations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attestations_created ON attestations(created_at);

-- HubSpot OAuth connections
CREATE TABLE IF NOT EXISTS hubspot_connections (
  connection_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  portal_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER,
  hubspot_events_ok INTEGER DEFAULT 0, -- 0 or 1: Events API supported
  hubspot_events_error TEXT, -- Error code if Events API unsupported (e.g., HUBSPOT_EVENTS_UNSUPPORTED)
  scopes TEXT, -- Comma-separated list of granted scopes
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_hubspot_tenant ON hubspot_connections(tenant_id);

-- Recipe enablements (which recipes are active per tenant)
CREATE TABLE IF NOT EXISTS recipe_enablements (
  tenant_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL, -- 'A', 'B', 'C'
  enabled INTEGER NOT NULL DEFAULT 0, -- 0 or 1 (boolean)
  config_json TEXT, -- JSON config for recipe-specific settings
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, recipe_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Delivery jobs (HubSpot delivery tracking)
CREATE TABLE IF NOT EXISTS deliveries (
  delivery_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  portal_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'delivered', 'failed', 'retrying'
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER,
  last_error TEXT,
  action_plan_json TEXT, -- Frozen action plan (JSON array of action names) at mint time
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
  FOREIGN KEY (event_id) REFERENCES attestations(event_id)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_event ON deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_next_attempt ON deliveries(next_attempt_at);

-- Delivery attempts (retry history)
CREATE TABLE IF NOT EXISTS delivery_attempts (
  attempt_id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempted_at INTEGER NOT NULL,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_attempts_delivery ON delivery_attempts(delivery_id);

-- Delivery actions (idempotency tracking per action)
CREATE TABLE IF NOT EXISTS delivery_actions (
  action_id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  action_name TEXT NOT NULL, -- 'send_behavioral_event', 'patch_contact_properties', 'create_task', 'enroll_workflow'
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed'
  completed_at INTEGER,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(delivery_id),
  FOREIGN KEY (event_id) REFERENCES attestations(event_id),
  UNIQUE(tenant_id, event_id, action_name) -- One record per (tenant, event, action)
);

CREATE INDEX IF NOT EXISTS idx_delivery_actions_event ON delivery_actions(event_id);
CREATE INDEX IF NOT EXISTS idx_delivery_actions_delivery ON delivery_actions(delivery_id);

-- Auth Link Scanner Immunity Rail: minimal telemetry (no PII, no full URL)
CREATE TABLE IF NOT EXISTS telemetry_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  rid TEXT NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT,
  meta_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_telemetry_rid ON telemetry_events(rid);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry_events(ts);

CREATE TABLE IF NOT EXISTS redemption_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rid TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  decision TEXT NOT NULL,
  reason TEXT,
  dst_host TEXT,
  dst_path_len INTEGER,
  dst_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_redemption_rid ON redemption_ledger(rid);

-- Live Inbox Test: real email demo + simulate demo (no raw email stored)
CREATE TABLE IF NOT EXISTS live_tests (
  tid TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  email_hash TEXT NOT NULL,
  creator_ip_hash TEXT NOT NULL,
  protected_rid TEXT NOT NULL,
  control_token_hash TEXT NOT NULL,
  control_consumed_at INTEGER,
  notes TEXT,
  normal_link TEXT,
  protected_link TEXT,
  normal_scanner_seen_at INTEGER,
  protected_scanner_seen_at INTEGER,
  protected_redeemed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_live_tests_created ON live_tests(created_at);
CREATE INDEX IF NOT EXISTS idx_live_tests_email_hash ON live_tests(email_hash);
CREATE INDEX IF NOT EXISTS idx_live_tests_ip ON live_tests(creator_ip_hash);

CREATE TABLE IF NOT EXISTS live_test_events (
  id TEXT PRIMARY KEY,
  tid TEXT NOT NULL,
  variant TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  meta TEXT
);
CREATE INDEX IF NOT EXISTS idx_live_test_events_tid_created ON live_test_events(tid, created_at);
CREATE INDEX IF NOT EXISTS idx_live_test_events_kind_created ON live_test_events(kind, created_at);

CREATE TABLE IF NOT EXISTS control_tokens (
  tid TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  consumed_at INTEGER,
  consumed_by TEXT
);
