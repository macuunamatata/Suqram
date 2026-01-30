// EIG V1 Routes: GET/POST /r/:token handlers

import { getLinkByToken, getDomainByHostname, insertAttestation, getHubSpotConnection, getEnabledRecipes, upsertDelivery, insertDeliveryAttempt, markDeliveryActionCompleted } from './db';
import { IntentNonceDO } from './intent-nonce-do';
import { TenantConfigDO } from './tenant-config-do';
import { generateInterstitialHTML, POLICY_TEMPLATES } from './html';
import { signAttestation, type AttestationClaims } from './attestation';
import { deliverToHubSpot, calculateNextRetry, shouldRetry, type DeliveryResult } from './hubspot';

export interface Env {
  INTENT_NONCE: DurableObjectNamespace;
  TENANT_CONFIG: DurableObjectNamespace;
  TOKEN_REFRESH_MUTEX?: DurableObjectNamespace;
  EIG_DB: D1Database;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  EIG_PRIVATE_KEY?: string; // Base64-encoded Ed25519 private key (32 bytes)
  EIG_KEY_ID?: string; // Key ID (kid) for the private key
  EIG_PUBLIC_KEY_JWK?: string; // JSON string of public key in JWK format
  ENV?: string; // 'dev' | 'production' - for dev bypass
  HUBSPOT_CLIENT_ID?: string;
  HUBSPOT_CLIENT_SECRET?: string;
}

/**
 * Generate continuity cookie value (hash of IP + User-Agent)
 */
async function generateContinuityHash(request: Request): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || 'unknown';
  const data = `${ip}:${ua}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Get continuity ID from cookie or generate new one
 */
function getContinuityId(request: Request): string | null {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/continuity_id=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Generate CSRF token
 */
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify Turnstile token server-to-server
 * In dev mode, allows "DEV_BYPASS" token if ENV=dev
 */
async function verifyTurnstile(
  token: string,
  secretKey: string,
  ip: string,
  env?: string
): Promise<boolean> {
  // Dev bypass: ONLY in dev mode
  if (env === 'dev' && token === 'DEV_BYPASS') {
    return true;
  }

  // Hard fail if bypass attempted in production
  if (token === 'DEV_BYPASS' && env !== 'dev') {
    console.error('DEV_BYPASS attempted in non-dev environment');
    return false;
  }

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  formData.append('remoteip', ip);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json<{ success: boolean }>();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

/**
 * Validate destination URL to prevent open redirect
 * Rejects: non-https (except localhost), javascript:, data:, private IPs
 */
function validateDestinationUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Reject dangerous schemes
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return { valid: false, error: 'Dangerous protocol' };
    }

    // Allow http only for localhost/127.0.0.1
    const isLocalhost = parsed.hostname === 'localhost' || 
                        parsed.hostname === '127.0.0.1' ||
                        parsed.hostname.startsWith('127.') ||
                        parsed.hostname === '::1';
    
    if (!isLocalhost && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Non-https URL not allowed' };
    }

    // Reject private IP ranges (optional hardening)
    const hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') || hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') || hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') || hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') || hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') || hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') || hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') || hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') || hostname.startsWith('172.31.')) {
      return { valid: false, error: 'Private IP range not allowed' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Get or create continuity cookie
 */
function getOrCreateContinuityCookie(request: Request, continuityHash: string): string {
  const existing = getContinuityId(request);
  if (existing) {
    return existing;
  }
  // Generate new continuity ID (use hash as base, add timestamp for uniqueness)
  return `${continuityHash}-${Date.now()}`;
}

/**
 * GET /r/:token - Safe, never mints, renders interstitial
 */
export async function handleGetRoute(
  request: Request,
  env: Env,
  token: string
): Promise<Response> {
  // MUST be safe: never mint, never emit, never call HubSpot

  // 1. Resolve token to link (get tenant_id, destination_url, policy)
  const link = await getLinkByToken(env.EIG_DB, token);
  if (!link) {
    return new Response(JSON.stringify({ error: 'Link not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Get domain config for policy template from TenantConfigDO (source of truth)
  const hostname = new URL(request.url).hostname;
  const tenantConfigDOId = env.TENANT_CONFIG.idFromName('global');
  const tenantConfigDO = env.TENANT_CONFIG.get(tenantConfigDOId);
  const configUrl = new URL('/get-by-hostname', request.url);
  configUrl.searchParams.set('hostname', hostname);
  
  const configResponse = await tenantConfigDO.fetch(configUrl.toString());
  if (!configResponse.ok) {
    return new Response(JSON.stringify({ error: 'Domain not configured' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tenantConfig = await configResponse.json<{
    tenant_id: string;
    hostname: string;
    policy_template: 'low_friction' | 'b2b_corporate' | 'high_sensitivity';
  }>();

  const policy = tenantConfig.policy_template;
  const policyConfig = POLICY_TEMPLATES[policy];

  // 3. Generate continuity hash and get/create continuity cookie
  const continuityHash = await generateContinuityHash(request);
  const continuityId = getOrCreateContinuityCookie(request, continuityHash);

  // 4. Request nonce from IntentNonceDO
  const nonceDOId = env.INTENT_NONCE.idFromName(`token:${token}`);
  const nonceDO = env.INTENT_NONCE.get(nonceDOId);
  const nonceUrl = new URL('/issue', request.url);
  nonceUrl.searchParams.set('token', token);
  nonceUrl.searchParams.set('continuity_hash', continuityHash);
  nonceUrl.searchParams.set('ttl_ms', policyConfig.nonce_ttl.toString());

  const nonceResponse = await nonceDO.fetch(nonceUrl.toString());
  if (!nonceResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to issue nonce' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nonceData = await nonceResponse.json<{ nonce: string; exp: number }>();

  // 5. Generate CSRF token
  const csrfToken = generateCSRFToken();

  // 6. Generate HTML interstitial
  if (!env.TURNSTILE_SITE_KEY) {
    return new Response(JSON.stringify({ error: 'Turnstile not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const html = generateInterstitialHTML(
    token,
    policy,
    env.TURNSTILE_SITE_KEY,
    csrfToken,
    nonceData.nonce
  );

  // 7. Return HTML with cookies (store nonce for POST)
  // CSRF cookie: Path=/r, Secure (if HTTPS), SameSite=Lax, HttpOnly
  const isSecure = new URL(request.url).protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  const headers = new Headers({
    'Content-Type': 'text/html',
    'Set-Cookie': [
      `continuity_id=${continuityId}; SameSite=Lax; Path=/; Max-Age=86400`, // 24 hours
      `csrf_token=${csrfToken}; SameSite=Lax; Path=/r; HttpOnly; Max-Age=3600${secureFlag}`, // 1 hour, Path=/r, Secure if HTTPS
      `nonce=${nonceData.nonce}; SameSite=Lax; Path=/; Max-Age=${Math.floor(policyConfig.nonce_ttl / 1000)}`, // Match nonce TTL
    ].join(', '),
  });

  return new Response(html, { headers });
}

/**
 * POST /r/:token - Only mint path, validates everything, mints attestation
 */
export async function handlePostRoute(
  request: Request,
  env: Env,
  token: string,
  ctx?: ExecutionContext
): Promise<Response> {
  // 1. Validate continuity cookie
  const continuityId = getContinuityId(request);
  if (!continuityId) {
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: 'missing_continuity' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Validate CSRF (double-submit: cookie + form field)
  const cookies = request.headers.get('Cookie') || '';
  const csrfCookieMatch = cookies.match(/csrf_token=([^;]+)/);
  const csrfCookie = csrfCookieMatch ? csrfCookieMatch[1] : null;

  const formData = await request.formData();
  const csrfForm = formData.get('csrf') as string | null;
  const turnstileToken = formData.get('cf-turnstile-response') as string | null;

  // Also check X-CSRF header (if sent via fetch/XHR)
  const csrfHeader = request.headers.get('X-CSRF');
  const csrfValue = csrfForm || csrfHeader;

  if (!csrfCookie || !csrfValue || csrfCookie !== csrfValue) {
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: 'csrf_mismatch' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Verify Turnstile
  if (!turnstileToken) {
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: 'missing_turnstile' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: 'turnstile_not_configured' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const turnstileValid = await verifyTurnstile(
    turnstileToken, 
    env.TURNSTILE_SECRET_KEY, 
    ip,
    env.ENV
  );
  if (!turnstileValid) {
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: 'turnstile_failed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Resolve token to link
  const link = await getLinkByToken(env.EIG_DB, token);
  if (!link) {
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: 'link_not_found' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 5. Generate continuity hash and redeem nonce
  const continuityHash = await generateContinuityHash(request);
  const nonceDOId = env.INTENT_NONCE.idFromName(`token:${token}`);
  const nonceDO = env.INTENT_NONCE.get(nonceDOId);

  // Get nonce from cookie (set during GET)
  const nonceCookieMatch = cookies.match(/nonce=([^;]+)/);
  const nonce = nonceCookieMatch ? nonceCookieMatch[1] : null;

  if (!nonce) {
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: 'missing_nonce' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const redeemUrl = new URL('/redeem', request.url);
  redeemUrl.searchParams.set('nonce', nonce);
  redeemUrl.searchParams.set('continuity_hash', continuityHash);

  const redeemResponse = await nonceDO.fetch(redeemUrl.toString());
  if (!redeemResponse.ok) {
    const error = await redeemResponse.json<{ ok: false; error: string }>();
    
    // REPLAY UX: If nonce redeem returns REPLAY, check for recent issued attestation
    // Use continuity_hash to find the exact attestation for this session
    if (error.error === 'REPLAY') {
      const recentAttestation = await env.EIG_DB.prepare(`
        SELECT destination_url, created_at FROM attestations
        WHERE tenant_id = ? AND token = ? AND continuity_hash = ? AND decision = 'issued' AND created_at > ?
        ORDER BY created_at DESC LIMIT 1
      `).bind(
        link.tenant_id,
        token,
        continuityHash,
        Date.now() - 10 * 60 * 1000
      ).first<{
        destination_url: string | null;
        created_at: number;
      }>();
      
      if (recentAttestation && recentAttestation.destination_url) {
        // Redirect to destination from that attestation (not fresh link lookup)
        return new Response(null, {
          status: 302,
          headers: {
            Location: recentAttestation.destination_url,
          },
        });
      }
      
      // No recent issued attestation - show retry page
      return new Response(
        JSON.stringify({ 
          decision: 'denied', 
          reason_code: 'REPLAY',
          retry: true,
          message: 'This link has already been used. Please try again.'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: error.error }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 6. Mint Intent Attestation
  const now = Math.floor(Date.now() / 1000);
  const eventId = crypto.randomUUID();

  // Get subject hash (from link metadata or derive from token)
  // For V1, we'll use a hash of the token as subject
  const subjectHash = await sha256Hex(`token:${token}`);

  // Validate destination URL (prevent open redirect)
  const destinationValidation = validateDestinationUrl(link.destination_url);
  if (!destinationValidation.valid) {
    await insertAttestation(env.EIG_DB, {
      tenant_id: link.tenant_id,
      token,
      nonce,
      decision: 'denied',
      reason_code: `invalid_destination: ${destinationValidation.error}`,
      destination_url: null,
      subject_hash: subjectHash,
      continuity_hash: continuityHash,
      created_at: Date.now(),
      expires_at: (now + 600) * 1000,
    });
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: 'invalid_destination' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get destination host only
  const destinationUrl = new URL(link.destination_url);
  const destinationHost = destinationUrl.hostname;

  // Get HubSpot connection for audience
  const hubspotConn = await getHubSpotConnection(env.EIG_DB, link.tenant_id);
  const audience = hubspotConn
    ? `hubspot:${hubspotConn.portal_id}`
    : 'hubspot';

  const claims: AttestationClaims = {
    iss: `eig:${link.tenant_id}`,
    aud: audience,
    jti: eventId,
    iat: now,
    exp: now + 600, // 10 minutes
    nonce,
    tid: link.tenant_id,
    evt: 'IntentAttestedClick',
    sub: subjectHash,
    dst: destinationHost,
    tok: token,
    cmp: link.campaign_id || link.message_id || link.utm_campaign
      ? {
          campaign_id: link.campaign_id || undefined,
          message_id: link.message_id || undefined,
          utm_campaign: link.utm_campaign || undefined,
          utm_source: link.utm_source || undefined,
          utm_medium: link.utm_medium || undefined,
        }
      : undefined,
    flags: {
      proof: 'turnstile_challenge', // TODO: derive from policy
      replay: false,
    },
  };

  // Sign attestation (requires private key)
  if (!env.EIG_PRIVATE_KEY || !env.EIG_KEY_ID) {
    return new Response(
      JSON.stringify({ decision: 'denied', reason_code: 'signing_key_missing' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Import private key
  const privateKeyBytes = Uint8Array.from(atob(env.EIG_PRIVATE_KEY), (c) => c.charCodeAt(0));
  const attestationModule = await import('./attestation');
  const privateKey = await attestationModule.importPrivateKey(privateKeyBytes, env.EIG_KEY_ID);

  const jws = await signAttestation(claims, privateKey, env.EIG_KEY_ID);

  // 7. Write ledger row (with continuity_hash for replay detection)
  await insertAttestation(env.EIG_DB, {
    tenant_id: link.tenant_id,
    token,
    nonce,
    decision: 'issued',
    reason_code: null,
    destination_url: link.destination_url,
    subject_hash: subjectHash,
    continuity_hash: continuityHash,
    created_at: Date.now(),
    expires_at: (now + 600) * 1000,
  });

  // 8. Deliver to HubSpot (non-blocking, with 800ms timeout, durable via ctx.waitUntil)
  // MUST NOT block redirect - always redirect immediately
  if (hubspotConn) {
    const enabledRecipes = await getEnabledRecipes(env.EIG_DB, link.tenant_id);
    
    // Freeze action plan at mint time (always send_event + enabled recipes)
    const actionPlan: string[] = ['send_behavioral_event'];
    if (enabledRecipes.includes('A')) actionPlan.push('patch_contact_properties');
    if (enabledRecipes.includes('B')) actionPlan.push('create_task');
    if (enabledRecipes.includes('C')) actionPlan.push('enroll_workflow');
    const actionPlanJson = JSON.stringify(actionPlan);
    
    // Create delivery record with frozen action plan (synchronous, before redirect)
    const deliveryId = await upsertDelivery(env.EIG_DB, {
      event_id: eventId,
      tenant_id: link.tenant_id,
      portal_id: hubspotConn.portal_id,
      status: 'pending',
      attempt_count: 0,
      next_attempt_at: null,
      last_error: null,
      action_plan_json: actionPlanJson,
      completed_at: null,
    });

    // Start delivery with timeout (non-blocking)
    // Use Promise.race to enforce 800ms max time budget
    const deliveryPromise = deliverToHubSpot(
      eventId,
      claims,
      hubspotConn,
      enabledRecipes,
      link,
      env.EIG_DB,
      deliveryId,
      {
        HUBSPOT_CLIENT_ID: env.HUBSPOT_CLIENT_ID,
        HUBSPOT_CLIENT_SECRET: env.HUBSPOT_CLIENT_SECRET,
        TOKEN_REFRESH_MUTEX: env.TOKEN_REFRESH_MUTEX,
      }
    );

    const timeoutPromise = new Promise<DeliveryResult>((resolve) => {
      setTimeout(() => {
        resolve({
          success: false,
          error: 'Delivery timeout (800ms exceeded)',
          errorCode: 'DELIVERY_TIMEOUT',
        });
      }, 800);
    });

    // Race delivery against timeout, use ctx.waitUntil() for durability
    const deliveryTask = Promise.race([deliveryPromise, timeoutPromise])
      .then(async (deliveryResult) => {
        // Update delivery record
        await upsertDelivery(env.EIG_DB, {
          event_id: eventId,
          tenant_id: link.tenant_id,
          portal_id: hubspotConn.portal_id,
          status: deliveryResult.success ? 'delivered' : 'retrying',
          attempt_count: 1,
          next_attempt_at: deliveryResult.success ? null : calculateNextRetry(1),
          last_error: deliveryResult.error || null,
          action_plan_json: actionPlanJson, // Preserve frozen plan
          completed_at: deliveryResult.success ? Date.now() : null,
        });

        // Mark actions as completed (idempotent)
        if (deliveryResult.success) {
          await markDeliveryActionCompleted(
            env.EIG_DB,
            deliveryId,
            link.tenant_id,
            eventId,
            'send_behavioral_event'
          );
          
          if (enabledRecipes.includes('A')) {
            await markDeliveryActionCompleted(
              env.EIG_DB,
              deliveryId,
              link.tenant_id,
              eventId,
              'patch_contact_properties'
            );
          }
          if (enabledRecipes.includes('B')) {
            await markDeliveryActionCompleted(
              env.EIG_DB,
              deliveryId,
              link.tenant_id,
              eventId,
              'create_task'
            );
          }
          if (enabledRecipes.includes('C')) {
            await markDeliveryActionCompleted(
              env.EIG_DB,
              deliveryId,
              link.tenant_id,
              eventId,
              'enroll_workflow'
            );
          }
        } else if (deliveryResult.errorCode === 'DELIVERY_TIMEOUT') {
          // Timeout: ensure delivery is marked as pending for cron processing
          await upsertDelivery(env.EIG_DB, {
            event_id: eventId,
            tenant_id: link.tenant_id,
            portal_id: hubspotConn.portal_id,
            status: 'pending',
            attempt_count: 0,
            next_attempt_at: Date.now(), // Process immediately
            last_error: 'Delivery timeout (800ms exceeded)',
            action_plan_json: actionPlanJson,
            completed_at: null,
          });
        }
      })
      .catch(async (err) => {
        // On any error, mark delivery as retrying
        console.error('HubSpot delivery error:', err);
        await upsertDelivery(env.EIG_DB, {
          event_id: eventId,
          tenant_id: link.tenant_id,
          portal_id: hubspotConn.portal_id,
          status: 'retrying',
          attempt_count: 1,
          next_attempt_at: calculateNextRetry(1),
          last_error: err.message || 'Unknown error',
          action_plan_json: actionPlanJson,
          completed_at: null,
        });
      });

    // Use ctx.waitUntil() to ensure delivery completes even after redirect
    if (ctx) {
      ctx.waitUntil(deliveryTask);
    } else {
      // Fallback if ctx not available (shouldn't happen in production)
      deliveryTask.catch((err) => console.error('Delivery task failed:', err));
    }
  }

  // 9. Redirect to destination immediately (never block on HubSpot)
  return new Response(null, {
    status: 302,
    headers: {
      Location: link.destination_url,
    },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
