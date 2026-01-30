// Admin endpoints for HubSpot OAuth and recipe management

import { getHubSpotConnection, getEnabledRecipes } from './db';
import { testEventsAPICapability, listWorkflows } from './hubspot';

export interface Env {
  EIG_DB: D1Database;
  ADMIN_API_KEY?: string;
  HUBSPOT_CLIENT_ID?: string;
  HUBSPOT_CLIENT_SECRET?: string;
  HUBSPOT_REDIRECT_URI?: string;
}

/**
 * GET /admin/hubspot/install
 * Redirects to HubSpot OAuth authorization URL
 */
export async function handleHubSpotInstall(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant_id');
  
  if (!tenantId) {
    return new Response(
      JSON.stringify({ error: 'Missing tenant_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  if (!env.HUBSPOT_CLIENT_ID || !env.HUBSPOT_REDIRECT_URI) {
    return new Response(
      JSON.stringify({ error: 'HubSpot OAuth not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Build HubSpot OAuth URL
  const stateData = JSON.stringify({ tenant_id: tenantId });
  const stateBytes = new TextEncoder().encode(stateData);
  const stateB64 = btoa(String.fromCharCode(...stateBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
  authUrl.searchParams.set('client_id', env.HUBSPOT_CLIENT_ID);
  // Required scopes for all recipes
  authUrl.searchParams.set('scope', 'analytics.behavioral_events.send crm.objects.contacts.write crm.objects.tasks.write automation');
  authUrl.searchParams.set('redirect_uri', env.HUBSPOT_REDIRECT_URI);
  authUrl.searchParams.set('state', stateB64);
  
  return new Response(null, {
    status: 302,
    headers: { Location: authUrl.toString() },
  });
}

/**
 * GET /admin/hubspot/callback
 * Exchanges authorization code for tokens and stores connection
 */
export async function handleHubSpotCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: 'Missing code or state' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  if (!env.HUBSPOT_CLIENT_ID || !env.HUBSPOT_CLIENT_SECRET || !env.HUBSPOT_REDIRECT_URI) {
    return new Response(
      JSON.stringify({ error: 'HubSpot OAuth not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Decode state to get tenant_id
    const stateB64Decoded = state.replace(/-/g, '+').replace(/_/g, '/');
    const padding = stateB64Decoded.length % 4;
    const statePadded = stateB64Decoded + '='.repeat(padding ? 4 - padding : 0);
    const stateBytes = Uint8Array.from(atob(statePadded), c => c.charCodeAt(0));
    const stateData = JSON.parse(new TextDecoder().decode(stateBytes));
    const tenantId = stateData.tenant_id;
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Invalid state' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.HUBSPOT_CLIENT_ID,
        client_secret: env.HUBSPOT_CLIENT_SECRET,
        redirect_uri: env.HUBSPOT_REDIRECT_URI,
        code,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return new Response(
        JSON.stringify({ error: 'Token exchange failed', details: errorText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const tokenData = await tokenResponse.json<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      hub_id: string;
    }>();
    
    // Get portal ID from hub_id
    const portalId = tokenData.hub_id;
    const expiresAt = Date.now() + (tokenData.expires_in * 1000);
    
    // Get scopes from token response (if available)
    const scopes = (tokenData as any).scope || '';
    
    // Test Events API capability
    const eventsTest = await testEventsAPICapability(tokenData.access_token);
    const hubspotEventsOk = eventsTest.supported ? 1 : 0;
    const hubspotEventsError = eventsTest.errorCode || null;
    
    // Store connection in D1
    const connectionId = crypto.randomUUID();
    const now = Date.now();
    
    const stmt = env.EIG_DB.prepare(`
      INSERT OR REPLACE INTO hubspot_connections (
        connection_id, tenant_id, portal_id, access_token, refresh_token,
        expires_at, hubspot_events_ok, hubspot_events_error, scopes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
        COALESCE((SELECT created_at FROM hubspot_connections WHERE tenant_id = ?), ?),
        ?
      )
    `);
    
    await stmt
      .bind(
        connectionId,
        tenantId,
        portalId,
        tokenData.access_token,
        tokenData.refresh_token,
        expiresAt,
        hubspotEventsOk,
        hubspotEventsError,
        scopes,
        tenantId,
        now,
        now
      )
      .run();
    
    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenantId,
        portal_id: portalId,
        connection_id: connectionId,
        hubspot_events_ok: hubspotEventsOk === 1,
        hubspot_events_error: hubspotEventsError,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Callback processing failed', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /admin/recipes/:id/enable
 * Toggle recipe enablement (A, B, or C) with scope/tier validation
 */
export async function handleRecipeEnable(
  request: Request,
  env: Env,
  recipeId: string
): Promise<Response> {
  if (!['A', 'B', 'C'].includes(recipeId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid recipe_id (must be A, B, or C)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant_id');
  
  if (!tenantId) {
    return new Response(
      JSON.stringify({ error: 'Missing tenant_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    const body = await request.json<{ enabled: boolean; config_json?: string }>();
    const enabled = body.enabled ? 1 : 0;
    
    // If enabling, validate requirements
    if (enabled === 1) {
      const connection = await getHubSpotConnection(env.EIG_DB, tenantId);
      
      if (!connection) {
        return new Response(
          JSON.stringify({ error: 'HubSpot connection not found. Complete OAuth first.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Check scopes
      const scopes = (connection.scopes || '').split(',').map(s => s.trim());
      
      // Recipe A requires: crm.objects.contacts.write
      if (recipeId === 'A' && !scopes.includes('crm.objects.contacts.write')) {
        return new Response(
          JSON.stringify({
            error: 'Missing required scope: crm.objects.contacts.write',
            required_scope: 'crm.objects.contacts.write',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Recipe B requires: crm.objects.tasks.write
      if (recipeId === 'B' && !scopes.includes('crm.objects.tasks.write')) {
        return new Response(
          JSON.stringify({
            error: 'Missing required scope: crm.objects.tasks.write',
            required_scope: 'crm.objects.tasks.write',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Recipe C requires: automation scope and workflow enrollment support
      if (recipeId === 'C') {
        if (!scopes.includes('automation')) {
          return new Response(
            JSON.stringify({
              error: 'Missing required scope: automation',
              required_scope: 'automation',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        // Validate workflow ID if provided
        if (body.config_json) {
          try {
            const config = JSON.parse(body.config_json);
            if (config.workflow_id) {
              // Test workflow listing to verify API access
              const { listWorkflows } = await import('./hubspot');
              const workflows = await listWorkflows(connection.access_token);
              
              if (workflows.error) {
                return new Response(
                  JSON.stringify({
                    error: 'Workflow API not accessible',
                    details: workflows.error,
                  }),
                  { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
              }
              
              // Verify workflow exists
              const workflowExists = workflows.workflows.some(
                w => w.id === config.workflow_id.toString()
              );
              
              if (!workflowExists) {
                return new Response(
                  JSON.stringify({
                    error: 'Workflow not found',
                    workflow_id: config.workflow_id,
                    available_workflows: workflows.workflows,
                  }),
                  { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
              }
            }
          } catch (e) {
            return new Response(
              JSON.stringify({
                error: 'Invalid config_json',
                details: (e as Error).message,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }
      
      // All recipes require Events API (except if we're disabling)
      if (connection.hubspot_events_ok === 0) {
        return new Response(
          JSON.stringify({
            error: 'HubSpot Events API not supported',
            error_code: connection.hubspot_events_error || 'HUBSPOT_EVENTS_UNSUPPORTED',
            message: 'Events API requires Enterprise tier. Recipe enablement blocked.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    const configJson = body.config_json || null;
    const now = Date.now();
    
    const stmt = env.EIG_DB.prepare(`
      INSERT OR REPLACE INTO recipe_enablements (
        tenant_id, recipe_id, enabled, config_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?,
        COALESCE((SELECT created_at FROM recipe_enablements WHERE tenant_id = ? AND recipe_id = ?), ?),
        ?
      )
    `);
    
    await stmt
      .bind(tenantId, recipeId, enabled, configJson, tenantId, recipeId, now, now)
      .run();
    
    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenantId,
        recipe_id: recipeId,
        enabled: enabled === 1,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Recipe enablement failed', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET /admin/domain/check?host=...
 * Verifies domain mapping exists (queries TenantConfigDO - same source as click path)
 */
export async function handleDomainCheck(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const hostname = url.searchParams.get('host');
  
  if (!hostname) {
    return new Response(
      JSON.stringify({ error: 'Missing host parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Query TenantConfigDO (same source of truth as click path)
  const tenantConfigDOId = env.TENANT_CONFIG.idFromName('global');
  const tenantConfigDO = env.TENANT_CONFIG.get(tenantConfigDOId);
  const configUrl = new URL('/get-by-hostname', request.url);
  configUrl.searchParams.set('hostname', hostname);
  
  const configResponse = await tenantConfigDO.fetch(configUrl.toString());
  
  if (!configResponse.ok) {
    return new Response(
      JSON.stringify({
        domain_ok: false,
        error: 'Domain not found in TenantConfigDO',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const tenantConfig = await configResponse.json<{
    tenant_id: string;
    hostname: string;
    policy_template: string;
  }>();
  
  return new Response(
    JSON.stringify({
      domain_ok: true,
      hostname: tenantConfig.hostname,
      tenant_id: tenantConfig.tenant_id,
      policy_template: tenantConfig.policy_template,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /admin/seed-domain
 * Configure hostname->tenant mapping in TenantConfigDO (local dev seeding)
 * Body: { hostname: string, tenant_id: string, policy_template: string }
 */
export async function handleSeedDomain(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json<{
      hostname: string;
      tenant_id: string;
      policy_template: 'low_friction' | 'b2b_corporate' | 'high_sensitivity';
    }>();

    if (!body.hostname || !body.tenant_id || !body.policy_template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: hostname, tenant_id, policy_template' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call TenantConfigDO to set the host
    const tenantConfigDOId = env.TENANT_CONFIG.idFromName('global');
    const tenantConfigDO = env.TENANT_CONFIG.get(tenantConfigDOId);
    const setHostUrl = new URL('/set-host', request.url);
    
    const setHostResponse = await tenantConfigDO.fetch(setHostUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostname: body.hostname,
        tenant_id: body.tenant_id,
        policy_template: body.policy_template,
      }),
    });

    if (!setHostResponse.ok) {
      const error = await setHostResponse.text();
      return new Response(
        JSON.stringify({ error: `Failed to set host: ${error}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await setHostResponse.json();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET /admin/workflows?tenant_id=...
 * List available workflows for Recipe C
 */
export async function handleListWorkflows(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant_id');
  
  if (!tenantId) {
    return new Response(
      JSON.stringify({ error: 'Missing tenant_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const connection = await getHubSpotConnection(env.EIG_DB, tenantId);
  
  if (!connection) {
    return new Response(
      JSON.stringify({ error: 'HubSpot connection not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const { listWorkflows } = await import('./hubspot');
  const result = await listWorkflows(connection.access_token);
  
  if (result.error) {
    return new Response(
      JSON.stringify({ error: 'Failed to list workflows', details: result.error }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  return new Response(
    JSON.stringify({ workflows: result.workflows }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * GET /admin/status?tenant_id=...
 * Returns onboarding status
 */
export async function handleStatus(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant_id');
  
  if (!tenantId) {
    return new Response(
      JSON.stringify({ error: 'Missing tenant_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Check domain
  const domainStmt = env.EIG_DB.prepare(`
    SELECT COUNT(*) as count FROM domains WHERE tenant_id = ?
  `);
  const domainResult = await domainStmt.bind(tenantId).first<{ count: number }>();
  const domainOk = (domainResult?.count || 0) > 0;
  
  // Check HubSpot connection
  const hubspotConn = await getHubSpotConnection(env.EIG_DB, tenantId);
  const hubspotOk = hubspotConn !== null;
  
  // Get enabled recipes
  const enabledRecipes = await getEnabledRecipes(env.EIG_DB, tenantId);
  const recipesEnabledCount = enabledRecipes.length;
  
  // Get last delivery error
  const deliveryStmt = env.EIG_DB.prepare(`
    SELECT last_error, created_at FROM deliveries
    WHERE tenant_id = ? AND last_error IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const deliveryError = await deliveryStmt.bind(tenantId).first<{
    last_error: string;
    created_at: number;
  }>();
  
  // Get last attestation
  const attestationStmt = env.EIG_DB.prepare(`
    SELECT created_at FROM attestations
    WHERE tenant_id = ? AND decision = 'issued'
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const lastAttestation = await attestationStmt.bind(tenantId).first<{
    created_at: number;
  }>();
  
  return new Response(
    JSON.stringify({
      domain_ok: domainOk,
      hubspot_ok: hubspotOk,
      recipes_enabled_count: recipesEnabledCount,
      last_delivery_error: deliveryError?.last_error || null,
      last_attestation_at: lastAttestation?.created_at || null,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
