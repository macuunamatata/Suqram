// D1 Database helpers for EIG

export interface LinkRow {
  link_id: string;
  tenant_id: string;
  token: string;
  destination_url: string;
  campaign_id: string | null;
  message_id: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  hubspot_contact_id: string | null;
  email: string | null;
  email_hash: string | null;
  created_at: number;
  expires_at: number | null;
}

export interface DomainRow {
  domain_id: string;
  tenant_id: string;
  hostname: string;
  policy_template: string;
  created_at: number;
}

export interface AttestationRow {
  event_id: string;
  tenant_id: string;
  token: string;
  nonce: string;
  decision: 'issued' | 'denied';
  reason_code: string | null;
  destination_url: string | null;
  subject_hash: string | null;
  continuity_hash: string | null;
  created_at: number;
  expires_at: number;
}

export interface HubSpotConnectionRow {
  connection_id: string;
  tenant_id: string;
  portal_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  hubspot_events_ok: number; // 0 or 1
  hubspot_events_error: string | null;
  scopes: string | null; // Comma-separated
  created_at: number;
  updated_at: number;
}

export interface RecipeEnablementRow {
  tenant_id: string;
  recipe_id: string;
  enabled: number;
  config_json: string | null;
  created_at: number;
  updated_at: number;
}

export interface DeliveryRow {
  delivery_id: string;
  event_id: string;
  tenant_id: string;
  portal_id: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempt_count: number;
  next_attempt_at: number | null;
  last_error: string | null;
  action_plan_json: string | null; // Frozen action plan at mint time
  created_at: number;
  completed_at: number | null;
}

/**
 * Resolve token to link data (destination_url, campaign info, tenant_id)
 */
export async function getLinkByToken(
  db: D1Database,
  token: string
): Promise<LinkRow | null> {
  const stmt = db.prepare(`
    SELECT * FROM links 
    WHERE token = ? 
    AND (expires_at IS NULL OR expires_at > ?)
    LIMIT 1
  `);
  const result = await stmt.bind(token, Date.now()).first<LinkRow>();
  return result || null;
}

/**
 * Get domain config by hostname
 */
export async function getDomainByHostname(
  db: D1Database,
  hostname: string
): Promise<DomainRow | null> {
  const normalized = hostname.toLowerCase().trim();
  const stmt = db.prepare(`
    SELECT * FROM domains 
    WHERE hostname = ? 
    LIMIT 1
  `);
  const result = await stmt.bind(normalized).first<DomainRow>();
  return result || null;
}

/**
 * Insert attestation ledger record
 * Handles unique constraint on (tenant_id, event_id)
 */
export async function insertAttestation(
  db: D1Database,
  attestation: Omit<AttestationRow, 'event_id'>
): Promise<string> {
  const eventId = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO attestations (
      event_id, tenant_id, token, nonce, decision, reason_code,
      destination_url, subject_hash, continuity_hash, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  try {
    await stmt
      .bind(
        eventId,
        attestation.tenant_id,
        attestation.token,
        attestation.nonce,
        attestation.decision,
        attestation.reason_code,
        attestation.destination_url,
        attestation.subject_hash,
        attestation.continuity_hash || null,
        attestation.created_at,
        attestation.expires_at
      )
      .run();
    return eventId;
  } catch (error: any) {
    // Handle unique constraint violation (duplicate event_id for tenant)
    if (error.message?.includes('UNIQUE constraint') || error.message?.includes('UNIQUE constraint failed')) {
      // Check if this event_id already exists for this tenant
      const existing = await attestationExists(db, eventId);
      if (existing) {
        return eventId; // Return existing event_id (idempotent)
      }
      // If constraint violation but event doesn't exist, retry with new event_id
      // This should be extremely rare (UUID collision)
      const retryEventId = crypto.randomUUID();
      const retryStmt = db.prepare(`
        INSERT INTO attestations (
          event_id, tenant_id, token, nonce, decision, reason_code,
          destination_url, subject_hash, continuity_hash, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      await retryStmt
        .bind(
          retryEventId,
          attestation.tenant_id,
          attestation.token,
          attestation.nonce,
          attestation.decision,
          attestation.reason_code,
          attestation.destination_url,
          attestation.subject_hash,
          attestation.continuity_hash || null,
          attestation.created_at,
          attestation.expires_at
        )
        .run();
      return retryEventId;
    }
    throw error;
  }
}

/**
 * Check if attestation event_id exists (for idempotency)
 */
export async function attestationExists(
  db: D1Database,
  eventId: string
): Promise<boolean> {
  const stmt = db.prepare('SELECT 1 FROM attestations WHERE event_id = ? LIMIT 1');
  const result = await stmt.bind(eventId).first();
  return !!result;
}

/**
 * Get HubSpot connection for tenant
 */
export async function getHubSpotConnection(
  db: D1Database,
  tenantId: string
): Promise<HubSpotConnectionRow | null> {
  const stmt = db.prepare(`
    SELECT * FROM hubspot_connections 
    WHERE tenant_id = ? 
    LIMIT 1
  `);
  const result = await stmt.bind(tenantId).first<HubSpotConnectionRow>();
  return result || null;
}

/**
 * Get enabled recipes for tenant
 */
export async function getEnabledRecipes(
  db: D1Database,
  tenantId: string
): Promise<string[]> {
  const stmt = db.prepare(`
    SELECT recipe_id FROM recipe_enablements 
    WHERE tenant_id = ? AND enabled = 1
  `);
  const results = await stmt.bind(tenantId).all<{ recipe_id: string }>();
  return results.results?.map((r) => r.recipe_id) || [];
}

/**
 * Create or update delivery job
 * Returns delivery_id (existing or new)
 */
export async function upsertDelivery(
  db: D1Database,
  delivery: Omit<DeliveryRow, 'delivery_id' | 'created_at'>
): Promise<string> {
  // Check if delivery already exists
  const existing = await db.prepare(`
    SELECT delivery_id, created_at FROM deliveries WHERE event_id = ? LIMIT 1
  `).bind(delivery.event_id).first<{ delivery_id: string; created_at: number }>();

  const deliveryId = existing?.delivery_id || crypto.randomUUID();
  const now = Date.now();
  const created_at = existing?.created_at || now;
  
  const stmt = db.prepare(`
    INSERT INTO deliveries (
      delivery_id, event_id, tenant_id, portal_id, status,
      attempt_count, next_attempt_at, last_error, action_plan_json, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id) DO UPDATE SET
      status = excluded.status,
      attempt_count = excluded.attempt_count,
      next_attempt_at = excluded.next_attempt_at,
      last_error = excluded.last_error,
      completed_at = excluded.completed_at
  `);
  await stmt
    .bind(
      deliveryId,
      delivery.event_id,
      delivery.tenant_id,
      delivery.portal_id,
      delivery.status,
      delivery.attempt_count,
      delivery.next_attempt_at,
      delivery.last_error,
      delivery.action_plan_json || null,
      created_at,
      delivery.completed_at
    )
    .run();
  return deliveryId;
}

/**
 * Record delivery attempt
 */
export async function insertDeliveryAttempt(
  db: D1Database,
  deliveryId: string,
  attemptNumber: number,
  statusCode: number | null,
  responseBody: string | null,
  errorMessage: string | null
): Promise<string> {
  const attemptId = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO delivery_attempts (
      attempt_id, delivery_id, attempt_number, status_code,
      response_body, error_message, attempted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  await stmt
    .bind(
      attemptId,
      deliveryId,
      attemptNumber,
      statusCode,
      responseBody,
      errorMessage,
      Date.now()
    )
    .run();
  return attemptId;
}

/**
 * Check if delivery action already completed (idempotency)
 */
export async function deliveryActionExists(
  db: D1Database,
  tenantId: string,
  eventId: string,
  actionName: string
): Promise<boolean> {
  const stmt = db.prepare(`
    SELECT 1 FROM delivery_actions 
    WHERE tenant_id = ? AND event_id = ? AND action_name = ? 
    AND status = 'completed'
    LIMIT 1
  `);
  const result = await stmt.bind(tenantId, eventId, actionName).first();
  return !!result;
}

/**
 * Mark delivery action as completed (idempotent)
 */
export async function markDeliveryActionCompleted(
  db: D1Database,
  deliveryId: string,
  tenantId: string,
  eventId: string,
  actionName: string
): Promise<string> {
  const actionId = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO delivery_actions (
      action_id, delivery_id, event_id, tenant_id, action_name, status, completed_at
    ) VALUES (?, ?, ?, ?, ?, 'completed', ?)
    ON CONFLICT(tenant_id, event_id, action_name) DO UPDATE SET
      status = 'completed',
      completed_at = excluded.completed_at
  `);
  await stmt
    .bind(actionId, deliveryId, eventId, tenantId, actionName, Date.now())
    .run();
  return actionId;
}

/**
 * Mark delivery action as failed
 */
export async function markDeliveryActionFailed(
  db: D1Database,
  deliveryId: string,
  tenantId: string,
  eventId: string,
  actionName: string
): Promise<string> {
  const actionId = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO delivery_actions (
      action_id, delivery_id, event_id, tenant_id, action_name, status, completed_at
    ) VALUES (?, ?, ?, ?, ?, 'failed', NULL)
    ON CONFLICT(tenant_id, event_id, action_name) DO UPDATE SET
      status = 'failed',
      completed_at = NULL
  `);
  await stmt
    .bind(actionId, deliveryId, eventId, tenantId, actionName)
    .run();
  return actionId;
}
