// HubSpot delivery integration (Production-grade)

import type {
  HubSpotConnectionRow,
  LinkRow,
} from './db';
import type { AttestationClaims } from './attestation';
import {
  deliveryActionExists,
  markDeliveryActionCompleted,
  markDeliveryActionFailed,
} from './db';

export interface HubSpotTokenRefreshEnv {
  HUBSPOT_CLIENT_ID?: string;
  HUBSPOT_CLIENT_SECRET?: string;
  TOKEN_REFRESH_MUTEX?: DurableObjectNamespace; // Optional mutex for preventing concurrent refreshes
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  errorCode?: string; // Deterministic error code (e.g., CONTACT_NOT_RESOLVABLE, HUBSPOT_EVENTS_UNSUPPORTED)
  retryAfter?: number; // milliseconds
}

export interface HubSpotError {
  status: number;
  message: string;
  category?: string;
  subCategory?: string;
  errors?: Array<{ message: string; in?: string }>;
}

/**
 * HubSpot API client with retry logic
 */
class HubSpotClient {
  private accessToken: string;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make API request with retry logic (exponential backoff + jitter)
   */
  async request(
    method: string,
    endpoint: string,
    body?: any,
    retryCount: number = 0
  ): Promise<{ ok: boolean; status: number; data?: any; error?: HubSpotError }> {
    const url = `https://api.hubapi.com${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseText = await response.text();
      let responseData: any = null;
      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch {
        // Not JSON
      }

      // Success
      if (response.ok) {
        return { ok: true, status: response.status, data: responseData };
      }

      // Parse error
      const error: HubSpotError = {
        status: response.status,
        message: responseData?.message || response.statusText || 'Unknown error',
        category: responseData?.category,
        subCategory: responseData?.subCategory,
        errors: responseData?.errors,
      };

      // Retry on 5xx and 429 (rate limit)
      const shouldRetry = (response.status >= 500 || response.status === 429) && retryCount < this.maxRetries;
      
      if (shouldRetry) {
        // Exponential backoff with jitter
        const delay = this.baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
        const totalDelay = delay + jitter;
        
        // For 429, use Retry-After header if present
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : totalDelay;
        
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 30000))); // Cap at 30s
        
        return this.request(method, endpoint, body, retryCount + 1);
      }

      return { ok: false, status: response.status, error };
    } catch (error: any) {
      // Network error - retry if attempts remaining
      if (retryCount < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request(method, endpoint, body, retryCount + 1);
      }
      
      return {
        ok: false,
        status: 0,
        error: {
          status: 0,
          message: error.message || 'Network error',
        },
      };
    }
  }
}

/**
 * Refresh HubSpot access token if expired
 * Returns updated connection or null if refresh failed
 * Uses mutex to prevent concurrent refresh overwrites
 */
export async function refreshHubSpotToken(
  connection: HubSpotConnectionRow,
  db: D1Database,
  env: HubSpotTokenRefreshEnv
): Promise<HubSpotConnectionRow | null> {
  // Check if token is expired (with 5 minute buffer)
  const now = Date.now();
  const expiresAt = connection.expires_at || 0;
  const buffer = 5 * 60 * 1000; // 5 minutes
  
  if (expiresAt > now + buffer) {
    return connection; // Token still valid
  }
  
  if (!connection.refresh_token) {
    console.error('No refresh token available for HubSpot connection');
    return null;
  }
  
  if (!env.HUBSPOT_CLIENT_ID || !env.HUBSPOT_CLIENT_SECRET) {
    console.error('HubSpot OAuth credentials not configured');
    return null;
  }
  
  // Use mutex to prevent concurrent refresh (if available)
  if (env.TOKEN_REFRESH_MUTEX) {
    const mutexDOId = env.TOKEN_REFRESH_MUTEX.idFromName(`tenant:${connection.tenant_id}`);
    const mutexDO = env.TOKEN_REFRESH_MUTEX.get(mutexDOId);
    
    // Try to acquire lock
    const lockUrl = new URL('/lock', 'http://localhost');
    lockUrl.searchParams.set('tenant_id', connection.tenant_id);
    const lockResponse = await mutexDO.fetch(lockUrl.toString());
    
    if (!lockResponse.ok) {
      // Lock already held - wait for existing refresh or return current connection
      const lockData = await lockResponse.json<{ locked: boolean; expiresAt?: number }>();
      if (lockData.locked && lockData.expiresAt) {
        // Wait up to 5 seconds for lock to be released
        const waitUntil = Math.min(lockData.expiresAt, Date.now() + 5000);
        while (Date.now() < waitUntil) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const checkResponse = await mutexDO.fetch(lockUrl.toString());
          if (checkResponse.ok) {
            break; // Lock released
          }
        }
        
        // Re-check token expiry after waiting (another refresh may have completed)
        const updatedConnection = await db.prepare(`
          SELECT * FROM hubspot_connections WHERE connection_id = ?
        `).bind(connection.connection_id).first<HubSpotConnectionRow>();
        
        if (updatedConnection) {
          const updatedExpiresAt = updatedConnection.expires_at || 0;
          if (updatedExpiresAt > now + buffer) {
            // Token was refreshed by another call
            return updatedConnection;
          }
        }
      }
    }
    
    // We have the lock (or mutex not available) - proceed with refresh
    try {
      return await performTokenRefresh(connection, db, env);
    } finally {
      // Release lock
      const unlockUrl = new URL('/unlock', 'http://localhost');
      unlockUrl.searchParams.set('tenant_id', connection.tenant_id);
      await mutexDO.fetch(unlockUrl.toString()).catch(() => {
        // Ignore unlock errors
      });
    }
  } else {
    // No mutex available - perform refresh directly (may have race condition)
    return await performTokenRefresh(connection, db, env);
  }
}

/**
 * Perform the actual token refresh (called with lock held)
 */
async function performTokenRefresh(
  connection: HubSpotConnectionRow,
  db: D1Database,
  env: HubSpotTokenRefreshEnv
): Promise<HubSpotConnectionRow | null> {
  try {
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: env.HUBSPOT_CLIENT_ID!,
        client_secret: env.HUBSPOT_CLIENT_SECRET!,
        refresh_token: connection.refresh_token!,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('HubSpot token refresh failed:', errorText);
      return null;
    }
    
    const tokenData = await tokenResponse.json<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    }>();
    
    const newExpiresAt = Date.now() + (tokenData.expires_in * 1000);
    const newRefreshToken = tokenData.refresh_token || connection.refresh_token;
    
    // Update connection in database atomically
    const stmt = db.prepare(`
      UPDATE hubspot_connections
      SET access_token = ?,
          refresh_token = ?,
          expires_at = ?,
          updated_at = ?
      WHERE connection_id = ?
    `);
    
    await stmt
      .bind(
        tokenData.access_token,
        newRefreshToken,
        newExpiresAt,
        Date.now(),
        connection.connection_id
      )
      .run();
    
    return {
      ...connection,
      access_token: tokenData.access_token,
      refresh_token: newRefreshToken,
      expires_at: newExpiresAt,
      updated_at: Date.now(),
    };
  } catch (error: any) {
    console.error('HubSpot token refresh error:', error);
    return null;
  }
}

/**
 * Resolve contact ID from link data
 * Strategy: hubspot_contact_id -> email search -> fail
 */
export async function resolveContactId(
  link: LinkRow,
  accessToken: string
): Promise<{ contactId: string | null; error?: string }> {
  // Strategy 1: Direct contact ID
  if (link.hubspot_contact_id) {
    return { contactId: link.hubspot_contact_id };
  }

  // Strategy 2: Search by email
  if (link.email) {
    const client = new HubSpotClient(accessToken);
    const result = await client.request(
      'POST',
      '/crm/v3/objects/contacts/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: link.email,
              },
            ],
          },
        ],
        properties: ['id'],
        limit: 1,
      }
    );

    if (result.ok && result.data?.results && result.data.results.length > 0) {
      return { contactId: result.data.results[0].id };
    }

    // Email search returned no results
    return { contactId: null, error: 'CONTACT_NOT_FOUND' };
  }

  // Strategy 3: Search by email_hash (if available)
  if (link.email_hash) {
    // Note: HubSpot doesn't support searching by hash directly
    // This would require a custom property or external lookup table
    // For V1, we'll skip this and require email or contact_id
    return { contactId: null, error: 'CONTACT_NOT_RESOLVABLE' };
  }

  return { contactId: null, error: 'CONTACT_NOT_RESOLVABLE' };
}

/**
 * Send custom behavioral event via HubSpot Events API
 * Docs: https://developers.hubspot.com/docs/api-reference/events-send-event-completions-v3/basic/post-events-v3-send
 */
async function sendBehavioralEvent(
  portalId: string,
  accessToken: string,
  claims: AttestationClaims,
  contactId: string | null
): Promise<DeliveryResult> {
  const client = new HubSpotClient(accessToken);
  
  // Build event payload per HubSpot docs
  const payload: any = {
    eventName: 'IntentAttestedClick',
    occurredAt: claims.iat * 1000, // milliseconds
    properties: {
      event_id: claims.jti,
      receipt_id: claims.jti, // Same as event_id for now
      attestation_id: claims.jti,
      link_category: 'intent_attested',
      campaign_id: claims.cmp?.campaign_id || null,
      message_id: claims.cmp?.message_id || null,
      destination_host: claims.dst,
      issued_at: claims.iat * 1000,
      tenant_id: claims.tid,
      nonce: claims.nonce,
      token: claims.tok,
      proof_type: claims.flags.proof,
    },
  };

  // Add UTM parameters if present
  if (claims.cmp?.utm_campaign) {
    payload.properties.utm_campaign = claims.cmp.utm_campaign;
  }
  if (claims.cmp?.utm_source) {
    payload.properties.utm_source = claims.cmp.utm_source;
  }
  if (claims.cmp?.utm_medium) {
    payload.properties.utm_medium = claims.cmp.utm_medium;
  }

  // Associate to contact if available
  if (contactId) {
    payload.objectId = contactId;
  }

  const result = await client.request('POST', '/events/v3/send', payload);

  if (!result.ok) {
    const error = result.error!;
    
    // Check for tier/product limitations
    if (error.status === 403 || error.status === 400) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes('not available') ||
        errorMessage.includes('not supported') ||
        errorMessage.includes('tier') ||
        errorMessage.includes('enterprise')
      ) {
        return {
          success: false,
          statusCode: error.status,
          error: error.message,
          errorCode: 'HUBSPOT_EVENTS_UNSUPPORTED',
          retryAfter: undefined, // Don't retry
        };
      }
    }

    return {
      success: false,
      statusCode: error.status,
      error: error.message,
      retryAfter: error.status === 429 ? 60000 : 5000,
    };
  }

  return { success: true, statusCode: result.status };
}

/**
 * Recipe A: PATCH contact properties
 * Docs: https://developers.hubspot.com/docs/api-reference/crm-contacts-v3/guide
 */
async function executeRecipeA(
  portalId: string,
  accessToken: string,
  claims: AttestationClaims,
  contactId: string
): Promise<DeliveryResult> {
  const client = new HubSpotClient(accessToken);
  
  const now = new Date().toISOString();
  const result = await client.request(
    'PATCH',
    `/crm/v3/objects/contacts/${contactId}`,
    {
      properties: {
        trusted_engaged: 'true',
        last_trusted_engagement_at: now,
        last_trusted_engagement_event_id: claims.jti,
      },
    }
  );

  if (!result.ok) {
    return {
      success: false,
      statusCode: result.error!.status,
      error: result.error!.message,
      retryAfter: result.error!.status === 429 ? 60000 : 5000,
    };
  }

  return { success: true, statusCode: result.status };
}

/**
 * Recipe B: Create task and associate to contact
 * Docs: https://developers.hubspot.com/docs/api-reference/crm-tasks-v3/guide
 */
async function executeRecipeB(
  portalId: string,
  accessToken: string,
  claims: AttestationClaims,
  contactId: string
): Promise<DeliveryResult> {
  const client = new HubSpotClient(accessToken);
  
  const result = await client.request('POST', '/crm/v3/objects/tasks', {
    properties: {
      hs_timestamp: new Date().toISOString(),
      hs_task_type: 'CALL',
      hs_task_subject: 'Trusted engagement: Intent Attestation',
      hs_task_body: `Contact engaged via verified intent attestation. Event ID: ${claims.jti}`,
    },
    associations: [
      {
        to: { id: contactId },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 3, // Contact to Task association
          },
        ],
      },
    ],
  });

  if (!result.ok) {
    return {
      success: false,
      statusCode: result.error!.status,
      error: result.error!.message,
      retryAfter: result.error!.status === 429 ? 60000 : 5000,
    };
  }

  return { success: true, statusCode: result.status };
}

/**
 * Recipe C: Enroll contact in workflow
 * Docs: https://developers.hubspot.com/docs/api-reference/legacy/create-manage-workflows-v3/get-automation-v3-workflows
 * Note: Enrollment API has known issues; we gate this carefully
 */
async function executeRecipeC(
  portalId: string,
  accessToken: string,
  claims: AttestationClaims,
  contactId: string,
  workflowId: string
): Promise<DeliveryResult> {
  const client = new HubSpotClient(accessToken);
  
  // Attempt enrollment via legacy API
  // Endpoint: POST /automation/v3/workflows/{workflowId}/enrollments/contacts/{contactId}
  const result = await client.request(
    'POST',
    `/automation/v3/workflows/${workflowId}/enrollments/contacts/${contactId}`,
    {}
  );

  if (!result.ok) {
    const error = result.error!;
    
    // Check for known enrollment issues
    if (error.status === 404 || error.status === 400) {
      return {
        success: false,
        statusCode: error.status,
        error: error.message,
        errorCode: 'WORKFLOW_ENROLLMENT_UNSUPPORTED',
        retryAfter: undefined, // Don't retry
      };
    }

    return {
      success: false,
      statusCode: error.status,
      error: error.message,
      retryAfter: error.status === 429 ? 60000 : 5000,
    };
  }

  return { success: true, statusCode: result.status };
}

/**
 * Deliver Intent Attestation to HubSpot
 * Implements Recipes A, B, C with idempotency
 */
export async function deliverToHubSpot(
  eventId: string,
  claims: AttestationClaims,
  connection: HubSpotConnectionRow,
  enabledRecipes: string[],
  link: LinkRow,
  db: D1Database,
  deliveryId: string,
  env?: HubSpotTokenRefreshEnv
): Promise<DeliveryResult> {
  // Refresh token if needed
  let activeConnection = connection;
  if (env) {
    const refreshed = await refreshHubSpotToken(connection, db, env);
    if (refreshed) {
      activeConnection = refreshed;
    } else if (connection.expires_at && connection.expires_at < Date.now()) {
      return {
        success: false,
        error: 'HubSpot token expired and refresh failed',
        retryAfter: 60000,
      };
    }
  }
  
  const accessToken = activeConnection.access_token;

  // Resolve contact ID
  const contactResolution = await resolveContactId(link, accessToken);
  
  if (!contactResolution.contactId && contactResolution.error === 'CONTACT_NOT_RESOLVABLE') {
    // For Events API, we can still send without contact association if HubSpot allows
    // But recipes require contact, so we'll fail the delivery
    return {
      success: false,
      error: 'Contact not resolvable',
      errorCode: 'CONTACT_NOT_RESOLVABLE',
      retryAfter: undefined, // Don't retry
    };
  }

  const contactId = contactResolution.contactId;

  try {
    // Step 1: Send custom behavioral event (idempotent)
    const actionNameEvent = 'send_behavioral_event';
    const eventAlreadySent = await deliveryActionExists(
      db,
      claims.tid,
      eventId,
      actionNameEvent
    );

    if (!eventAlreadySent) {
      const eventResult = await sendBehavioralEvent(
        connection.portal_id,
        accessToken,
        claims,
        contactId
      );

      if (!eventResult.success) {
        // Mark as failed if not retryable
        if (eventResult.errorCode) {
          await markDeliveryActionFailed(
            db,
            deliveryId,
            claims.tid,
            eventId,
            actionNameEvent
          );
        }
        return eventResult;
      }
      
      // Mark as completed
      await markDeliveryActionCompleted(
        db,
        deliveryId,
        claims.tid,
        eventId,
        actionNameEvent
      );
    }

    // Step 2: Execute enabled recipes (idempotent, require contact)
    if (!contactId) {
      // Can't run recipes without contact
      return {
        success: true, // Event sent successfully, recipes skipped
        statusCode: 200,
      };
    }

    const recipeResults: Array<{ recipe: string; success: boolean; error?: string }> = [];

    if (enabledRecipes.includes('A')) {
      const actionNameA = 'patch_contact_properties';
      const alreadyCompleted = await deliveryActionExists(
        db,
        claims.tid,
        eventId,
        actionNameA
      );
      if (!alreadyCompleted) {
        const recipeA = await executeRecipeA(
          connection.portal_id,
          accessToken,
          claims,
          contactId
        );
        if (recipeA.success) {
          await markDeliveryActionCompleted(
            db,
            deliveryId,
            claims.tid,
            eventId,
            actionNameA
          );
        } else {
          await markDeliveryActionFailed(
            db,
            deliveryId,
            claims.tid,
            eventId,
            actionNameA
          );
        }
        recipeResults.push({ recipe: 'A', success: recipeA.success, error: recipeA.error });
      } else {
        recipeResults.push({ recipe: 'A', success: true });
      }
    }

    if (enabledRecipes.includes('B')) {
      const actionNameB = 'create_task';
      const alreadyCompleted = await deliveryActionExists(
        db,
        claims.tid,
        eventId,
        actionNameB
      );
      if (!alreadyCompleted) {
        const recipeB = await executeRecipeB(
          connection.portal_id,
          accessToken,
          claims,
          contactId
        );
        if (recipeB.success) {
          await markDeliveryActionCompleted(
            db,
            deliveryId,
            claims.tid,
            eventId,
            actionNameB
          );
        } else {
          await markDeliveryActionFailed(
            db,
            deliveryId,
            claims.tid,
            eventId,
            actionNameB
          );
        }
        recipeResults.push({ recipe: 'B', success: recipeB.success, error: recipeB.error });
      } else {
        recipeResults.push({ recipe: 'B', success: true });
      }
    }

    if (enabledRecipes.includes('C')) {
      const actionNameC = 'enroll_workflow';
      const alreadyCompleted = await deliveryActionExists(
        db,
        claims.tid,
        eventId,
        actionNameC
      );
      if (!alreadyCompleted) {
        // Get workflow ID from recipe config
        const recipeConfigStmt = db.prepare(`
          SELECT config_json FROM recipe_enablements
          WHERE tenant_id = ? AND recipe_id = 'C' AND enabled = 1
        `);
        const recipeConfig = await recipeConfigStmt
          .bind(claims.tid)
          .first<{ config_json: string | null }>();
        
        if (!recipeConfig?.config_json) {
          recipeResults.push({
            recipe: 'C',
            success: false,
            error: 'Workflow ID not configured',
          });
        } else {
          try {
            const config = JSON.parse(recipeConfig.config_json);
            const workflowId = config.workflow_id;
            
            if (!workflowId) {
              recipeResults.push({
                recipe: 'C',
                success: false,
                error: 'Workflow ID missing in config',
              });
            } else {
              const recipeC = await executeRecipeC(
                connection.portal_id,
                accessToken,
                claims,
                contactId,
                workflowId
              );
              if (recipeC.success) {
                await markDeliveryActionCompleted(
                  db,
                  deliveryId,
                  claims.tid,
                  eventId,
                  actionNameC
                );
              } else {
                await markDeliveryActionFailed(
                  db,
                  deliveryId,
                  claims.tid,
                  eventId,
                  actionNameC
                );
              }
              recipeResults.push({
                recipe: 'C',
                success: recipeC.success,
                error: recipeC.error,
              });
            }
          } catch (e) {
            recipeResults.push({
              recipe: 'C',
              success: false,
              error: 'Invalid config_json',
            });
          }
        }
      } else {
        recipeResults.push({ recipe: 'C', success: true });
      }
    }

    // Check if any recipe failed
    const failedRecipes = recipeResults.filter((r) => !r.success);
    if (failedRecipes.length > 0) {
      console.warn('Some recipes failed', failedRecipes);
      // Don't fail entire delivery if event was sent
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
      retryAfter: 5000,
    };
  }
}

/**
 * Test Events API capability
 * Returns true if Events API is supported, false otherwise
 */
export async function testEventsAPICapability(
  accessToken: string
): Promise<{ supported: boolean; error?: string; errorCode?: string }> {
  const client = new HubSpotClient(accessToken);
  
  // Send a test event (will fail if unsupported, but we check the error)
  const result = await client.request('POST', '/events/v3/send', {
    eventName: 'IntentAttestedClick',
    occurredAt: Date.now(),
    properties: {
      test: true,
    },
  });

  if (result.ok) {
    return { supported: true };
  }

  const error = result.error!;
  
  // Check for tier/product limitations
  if (error.status === 403 || error.status === 400) {
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes('not available') ||
      errorMessage.includes('not supported') ||
      errorMessage.includes('tier') ||
      errorMessage.includes('enterprise')
    ) {
      return {
        supported: false,
        error: error.message,
        errorCode: 'HUBSPOT_EVENTS_UNSUPPORTED',
      };
    }
  }

  // Other errors might be transient - assume supported for now
  return { supported: true };
}

/**
 * List workflows for Recipe C dropdown
 * Docs: https://developers.hubspot.com/docs/api-reference/legacy/create-manage-workflows-v3/get-automation-v3-workflows
 */
export async function listWorkflows(
  accessToken: string
): Promise<{ workflows: Array<{ id: string; name: string }>; error?: string }> {
  const client = new HubSpotClient(accessToken);
  
  const result = await client.request('GET', '/automation/v3/workflows', undefined);

  if (!result.ok) {
    return {
      workflows: [],
      error: result.error!.message,
    };
  }

  // Parse workflow list
  const workflows = (result.data?.workflows || []).map((w: any) => ({
    id: w.id?.toString() || '',
    name: w.name || 'Unnamed workflow',
  }));

  return { workflows };
}

/**
 * Calculate next retry attempt time (exponential backoff)
 */
export function calculateNextRetry(attemptNumber: number): number {
  // Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s, 320s, 640s
  const baseDelay = 5000; // 5 seconds
  const maxDelay = 640000; // ~10.6 minutes
  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
  return Date.now() + delay;
}

/**
 * Check if delivery should be retried
 */
export function shouldRetry(
  attemptCount: number,
  lastError: string | null
): boolean {
  const maxAttempts = 8;
  if (attemptCount >= maxAttempts) {
    return false;
  }
  // Don't retry on 4xx errors (except 429 rate limit)
  if (lastError?.includes('status: 4')) {
    const statusMatch = lastError.match(/status: (\d+)/);
    if (statusMatch && statusMatch[1] !== '429') {
      return false;
    }
  }
  // Don't retry on deterministic error codes
  if (lastError?.includes('HUBSPOT_EVENTS_UNSUPPORTED') ||
      lastError?.includes('CONTACT_NOT_RESOLVABLE') ||
      lastError?.includes('WORKFLOW_ENROLLMENT_UNSUPPORTED')) {
    return false;
  }
  return true;
}
