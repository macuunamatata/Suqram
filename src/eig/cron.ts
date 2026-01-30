// Cron handler for processing pending HubSpot deliveries

import { getHubSpotConnection } from './db';
import { deliverToHubSpot, calculateNextRetry, shouldRetry, type DeliveryResult } from './hubspot';
import { deliveryActionExists, markDeliveryActionCompleted, markDeliveryActionFailed, upsertDelivery } from './db';
import type { HubSpotConnectionRow, DeliveryRow, LinkRow } from './db';
import type { AttestationClaims } from './attestation';

export interface CronEnv {
  EIG_DB: D1Database;
  TOKEN_REFRESH_MUTEX?: DurableObjectNamespace;
  HUBSPOT_CLIENT_ID?: string;
  HUBSPOT_CLIENT_SECRET?: string;
}

/**
 * Process pending deliveries (called by cron trigger)
 * Polls D1 for deliveries that need processing and executes remaining actions
 */
export async function handleCronDeliveries(env: CronEnv): Promise<{ processed: number; errors: number }> {
  const now = Date.now();
  let processed = 0;
  let errors = 0;

  // Find deliveries that need processing
  // Status: 'pending' or 'retrying', and next_attempt_at <= now (or null for pending)
  const pendingDeliveries = await env.EIG_DB.prepare(`
    SELECT d.*, a.destination_url, a.subject_hash, a.continuity_hash, a.created_at as attestation_created_at
    FROM deliveries d
    JOIN attestations a ON d.event_id = a.event_id
    WHERE (d.status = 'pending' OR d.status = 'retrying')
      AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= ?)
    ORDER BY d.created_at ASC
    LIMIT 50
  `).bind(now).all<DeliveryRow & {
    destination_url: string | null;
    subject_hash: string | null;
    continuity_hash: string | null;
    attestation_created_at: number;
  }>();

  if (!pendingDeliveries.results || pendingDeliveries.results.length === 0) {
    return { processed: 0, errors: 0 };
  }

  // Process each delivery
  for (const delivery of pendingDeliveries.results) {
    try {
      // Get HubSpot connection
      const connection = await getHubSpotConnection(env.EIG_DB, delivery.tenant_id);
      if (!connection) {
        // No connection - mark as failed
        await upsertDelivery(env.EIG_DB, {
          event_id: delivery.event_id,
          tenant_id: delivery.tenant_id,
          portal_id: delivery.portal_id,
          status: 'failed',
          attempt_count: delivery.attempt_count + 1,
          next_attempt_at: null,
          last_error: 'HubSpot connection not found',
          action_plan_json: delivery.action_plan_json,
          completed_at: null,
        });
        errors++;
        continue;
      }

      // Parse frozen action plan (from mint time)
      let actionPlan: string[] = [];
      if (delivery.action_plan_json) {
        try {
          actionPlan = JSON.parse(delivery.action_plan_json);
        } catch (e) {
          console.error('Failed to parse action_plan_json:', e);
          actionPlan = ['send_behavioral_event']; // Fallback
        }
      } else {
        // Legacy: no frozen plan, use default
        actionPlan = ['send_behavioral_event'];
      }

      // Check which actions are already completed (idempotency)
      const remainingActions: string[] = [];
      for (const actionName of actionPlan) {
        const exists = await deliveryActionExists(
          env.EIG_DB,
          delivery.tenant_id,
          delivery.event_id,
          actionName
        );
        if (!exists) {
          remainingActions.push(actionName);
        }
      }

      if (remainingActions.length === 0) {
        // All actions completed - mark delivery as delivered
        await upsertDelivery(env.EIG_DB, {
          event_id: delivery.event_id,
          tenant_id: delivery.tenant_id,
          portal_id: delivery.portal_id,
          status: 'delivered',
          attempt_count: delivery.attempt_count,
          next_attempt_at: null,
          last_error: null,
          action_plan_json: delivery.action_plan_json,
          completed_at: Date.now(),
        });
        processed++;
        continue;
      }

      // Reconstruct claims from attestation (minimal, for delivery)
      const claims: AttestationClaims = {
        iss: `eig:${delivery.tenant_id}`,
        aud: `hubspot:${delivery.portal_id}`,
        jti: delivery.event_id,
        iat: Math.floor(delivery.attestation_created_at / 1000),
        exp: Math.floor((delivery.attestation_created_at + 600000) / 1000),
        nonce: '', // Not needed for retry
        tid: delivery.tenant_id,
        evt: 'IntentAttestedClick',
        sub: delivery.subject_hash || '',
        dst: delivery.destination_url ? new URL(delivery.destination_url).hostname : '',
        tok: '', // Not needed for retry
        cmp: undefined,
        flags: {
          proof: 'turnstile_challenge',
          replay: false,
        },
      };

      // Reconstruct link (minimal, for contact resolution)
      const link: LinkRow = {
        link_id: '',
        tenant_id: delivery.tenant_id,
        token: '',
        destination_url: delivery.destination_url || '',
        campaign_id: null,
        message_id: null,
        utm_campaign: null,
        utm_source: null,
        utm_medium: null,
        hubspot_contact_id: null,
        email: null,
        email_hash: null,
        created_at: delivery.attestation_created_at,
        expires_at: null,
      };

      // Execute remaining actions using frozen plan
      const result = await executeRemainingActions(
        delivery,
        connection,
        claims,
        link,
        remainingActions,
        env
      );

      // Update delivery record
      const newAttemptCount = delivery.attempt_count + 1;
      const shouldRetryDelivery = shouldRetry(newAttemptCount, result.error || null);
      
      await upsertDelivery(env.EIG_DB, {
        event_id: delivery.event_id,
        tenant_id: delivery.tenant_id,
        portal_id: delivery.portal_id,
        status: result.success ? 'delivered' : (shouldRetryDelivery ? 'retrying' : 'failed'),
        attempt_count: newAttemptCount,
        next_attempt_at: result.success ? null : (shouldRetryDelivery ? calculateNextRetry(newAttemptCount) : null),
        last_error: result.error || null,
        action_plan_json: delivery.action_plan_json,
        completed_at: result.success ? Date.now() : null,
      });

      if (result.success) {
        processed++;
      } else if (shouldRetryDelivery) {
        processed++; // Count as processed (will retry later)
      } else {
        errors++;
      }
    } catch (error: any) {
      console.error(`Error processing delivery ${delivery.delivery_id}:`, error);
      errors++;
      
      // Mark as retrying (will retry later)
      const newAttemptCount = delivery.attempt_count + 1;
      const shouldRetryDelivery = shouldRetry(newAttemptCount, error.message);
      
      await upsertDelivery(env.EIG_DB, {
        event_id: delivery.event_id,
        tenant_id: delivery.tenant_id,
        portal_id: delivery.portal_id,
        status: shouldRetryDelivery ? 'retrying' : 'failed',
        attempt_count: newAttemptCount,
        next_attempt_at: shouldRetryDelivery ? calculateNextRetry(newAttemptCount) : null,
        last_error: error.message || 'Unknown error',
        action_plan_json: delivery.action_plan_json,
        completed_at: null,
      }).catch((updateErr) => {
        console.error('Failed to update delivery on error:', updateErr);
      });
    }
  }

  return { processed, errors };
}

/**
 * Execute remaining actions from frozen plan
 */
async function executeRemainingActions(
  delivery: DeliveryRow,
  connection: HubSpotConnectionRow,
  claims: AttestationClaims,
  link: LinkRow,
  remainingActions: string[],
  env: CronEnv
): Promise<DeliveryResult> {
  // Map action names to recipe IDs for deliverToHubSpot
  const enabledRecipes: string[] = [];
  if (remainingActions.includes('patch_contact_properties')) enabledRecipes.push('A');
  if (remainingActions.includes('create_task')) enabledRecipes.push('B');
  if (remainingActions.includes('enroll_workflow')) enabledRecipes.push('C');

  // Execute delivery (will check idempotency internally)
  const result = await deliverToHubSpot(
    delivery.event_id,
    claims,
    connection,
    enabledRecipes,
    link,
    env.EIG_DB,
    delivery.delivery_id,
    {
      HUBSPOT_CLIENT_ID: env.HUBSPOT_CLIENT_ID,
      HUBSPOT_CLIENT_SECRET: env.HUBSPOT_CLIENT_SECRET,
      TOKEN_REFRESH_MUTEX: env.TOKEN_REFRESH_MUTEX,
    }
  );

  return result;
}
