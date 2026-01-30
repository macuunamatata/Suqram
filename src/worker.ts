import { LinkGuardDO } from './do';
import { SitesDO } from './sites-do';
import { SiteConfig, LinkEvent } from './shared';
import { IntentNonceDO } from './eig/intent-nonce-do';
import { TenantConfigDO } from './eig/tenant-config-do';
import { TokenRefreshMutexDO } from './eig/token-refresh-mutex-do';
import { RedemptionPermitDO } from './rail/redemption-permit-do';
import { handleGetRail, handlePostRedeem } from './rail/routes';
import { handleTestSend, handleTestControl, handleTestStatus } from './live-test';
import { handleHealth, handleJWKS, handleVerify } from './eig/endpoints';
import {
  handleHubSpotInstall,
  handleHubSpotCallback,
  handleRecipeEnable,
  handleDomainCheck,
  handleSeedDomain,
  handleListWorkflows,
  handleStatus,
} from './eig/admin';
import { handleCronDeliveries } from './eig/cron';

// Export Durable Object classes for Wrangler
export { LinkGuardDO, SitesDO, IntentNonceDO, TenantConfigDO, TokenRefreshMutexDO, RedemptionPermitDO };

export interface Env {
  LINK_GUARD: DurableObjectNamespace;
  SITES: DurableObjectNamespace;
  REDEMPTION_PERMIT: DurableObjectNamespace;
  INTENT_NONCE: DurableObjectNamespace;
  TENANT_CONFIG: DurableObjectNamespace;
  TOKEN_REFRESH_MUTEX: DurableObjectNamespace;
  EIG_DB: D1Database;
  ADMIN_API_KEY?: string;
  ORIGIN_BASE_URL: string;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  PATH_ALLOWLIST?: string;
  QUERY_ALLOWLIST?: string;
  EIG_PRIVATE_KEY?: string;
  EIG_KEY_ID?: string;
  EIG_PUBLIC_KEY_JWK?: string;
  ENV?: string; // 'dev' | 'production' - for dev bypass
  HUBSPOT_CLIENT_ID?: string;
  HUBSPOT_CLIENT_SECRET?: string;
  HUBSPOT_REDIRECT_URI?: string;
  /** Rail: comma-separated exact hosts, e.g. "example.com,myapp.vercel.app" */
  ALLOWED_DEST_HOSTS?: string;
  /** Rail: comma-separated host suffixes, e.g. ".supabase.co,.vercel.app" */
  ALLOWED_DEST_HOST_SUFFIXES?: string;
  /** Rail: set to "1" or "true" to allow private IPs */
  ALLOWED_PRIVATE_IP?: string;
  /** Live inbox test: Resend API key */
  RESEND_API_KEY?: string;
  /** Live inbox test: from address (e.g. noreply@suqram.com) */
  TEST_FROM_EMAIL?: string;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function addCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Get the global Durable Object stub for all operations.
 * All mint, redeem, and events operations use the same DO instance.
 */
function getGuardStub(env: Env): DurableObjectStub {
  const id = env.LINK_GUARD.idFromName('global');
  return env.LINK_GUARD.get(id);
}

/**
 * Get the Sites Durable Object stub (global instance).
 */
function getSitesStub(env: Env): DurableObjectStub {
  const id = env.SITES.idFromName('global');
  return env.SITES.get(id);
}

/**
 * Get built-in demo site config for workers.dev hosts
 */
function getDemoSiteConfig(hostname: string, requestUrl: string): SiteConfig {
  const protocol = new URL(requestUrl).protocol;
  const originBaseUrl = `${protocol}//${hostname}`;
  
  return {
    siteId: 'demo-workers-dev',
    hostname,
    originBaseUrl,
    pathAllowlist: ['/demo', '/auth'],
    queryAllowlist: ['token', 'type', 'redirect_to', 'next', 'state'],
    turnstileEnabled: false,
    turnstileSiteKey: '',
    satHash: '', // Demo site doesn't use SAT
    createdAt: Date.now(),
  };
}

/**
 * Get local dev site config (for 127.0.0.1:8787 or localhost)
 */
function getLocalDevSiteConfig(hostname: string): SiteConfig {
  return {
    siteId: 'local-dev',
    hostname,
    originBaseUrl: 'http://127.0.0.1:8787',
    pathAllowlist: ['/auth', '/demo', '/reset', '/verify', '/invite', '/magic'],
    queryAllowlist: ['token', 'type', 'redirect_to', 'next', 'state', '__ttl_ms'],
    turnstileEnabled: false,
    turnstileSiteKey: '',
    satHash: '', // Local dev site doesn't use SAT
    createdAt: Date.now(),
  };
}

function normalizeHostHeader(input: string): string {
  let host = (input || '').trim().toLowerCase();
  while (host.endsWith('.')) host = host.slice(0, -1);

  // Strip port if present (host:port)
  if (host.includes(':')) {
    // Bracketed IPv6: [::1]:8787
    if (host.startsWith('[')) {
      const end = host.indexOf(']');
      if (end !== -1) host = host.slice(1, end);
    } else {
      host = host.split(':')[0];
    }
  }

  return host;
}

/**
 * Check if hostname is local dev (127.0.0.1 or localhost)
 */
function isLocalDevHost(hostname: string): boolean {
  const h = normalizeHostHeader(hostname);
  return h === '127.0.0.1' || h === 'localhost';
}

/**
 * Load site config by hostname.
 * Returns demo site for .workers.dev if no site exists.
 * Returns local dev site for localhost/127.0.0.1 if no site exists.
 */
async function getSiteConfig(request: Request, env: Env): Promise<{ site: SiteConfig | null; error: string | null }> {
  const url = new URL(request.url);
  const hostHeader = request.headers.get('Host') || url.host;
  const hostname = normalizeHostHeader(hostHeader);
  
  const stub = getSitesStub(env);
  const sitesUrl = new URL('/get-by-hostname', request.url);
  sitesUrl.searchParams.set('hostname', hostname);
  
  const response = await stub.fetch(sitesUrl.toString());
  
  if (response.status === 404) {
    // For local dev hosts, return built-in local dev site
    if (isLocalDevHost(hostname)) {
      return { site: getLocalDevSiteConfig(hostname), error: null };
    }
    // For .workers.dev hosts, return built-in demo site
    if (hostname.endsWith('.workers.dev')) {
      return { site: getDemoSiteConfig(hostname, request.url), error: null };
    }
    // For all other hosts, return unknown_site (strict behavior)
    return { site: null, error: 'unknown_site' };
  }
  
  if (!response.ok) {
    return { site: null, error: 'failed_to_load_site' };
  }
  
  const site = await response.json<SiteConfig>();
  return { site, error: null };
}

/**
 * Get site session from cookie (siteId:hostname)
 */
function getSiteSession(request: Request): { siteId: string; hostname: string } | null {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/site_session=([^;]+)/);
  if (!match) return null;
  
  try {
    const decoded = decodeURIComponent(match[1]);
    const [siteId, hostname] = decoded.split(':');
    if (siteId && hostname) {
      return { siteId, hostname };
    }
  } catch (e) {
    // Invalid cookie
  }
  return null;
}

/**
 * Verify SAT and return site config if valid
 * Scans all sites to find matching SAT (doesn't require hostname)
 */
async function verifySat(request: Request, env: Env, sat: string): Promise<{ site: SiteConfig | null; error: string | null }> {
  const stub = getSitesStub(env);
  const verifyUrl = new URL('/verify-sat-by-token', request.url);
  verifyUrl.searchParams.set('sat', sat);
  
  const response = await stub.fetch(verifyUrl.toString());
  
  if (response.status === 401 || response.status === 404) {
    return { site: null, error: 'invalid_sat' };
  }
  
  if (!response.ok) {
    return { site: null, error: 'verification_failed' };
  }
  
  const site = await response.json<SiteConfig>();
  return { site, error: null };
}

/**
 * Resolve site for receipts APIs using SAT header or site_session cookie.
 * Does NOT use Host header when SAT exists.
 */
async function resolveSiteForReceipts(request: Request, env: Env): Promise<{ site: SiteConfig | null; error: string | null }> {
  // 1) SAT header: Authorization: Bearer <SAT>
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const sat = authHeader.substring(7).trim();
    if (sat) {
      try {
        const satHash = await sha256Hex(sat);
        const stub = getSitesStub(env);
        const lookupUrl = new URL('/get-by-sathash', request.url);
        lookupUrl.searchParams.set('satHash', satHash);
        const response = await stub.fetch(lookupUrl.toString());

        if (response.ok) {
          const site = await response.json<SiteConfig>();
          return { site, error: null };
        }

        if (response.status === 401 || response.status === 404) {
          return { site: null, error: 'invalid_sat' };
        }

        return { site: null, error: 'verification_failed' };
      } catch {
        return { site: null, error: 'verification_failed' };
      }
    }
  }

  // 2) site_session cookie
  const session = getSiteSession(request);
  if (session) {
    const stub = getSitesStub(env);
    const getUrl = new URL('/get', request.url);
    getUrl.searchParams.set('siteId', session.siteId);
    const response = await stub.fetch(getUrl.toString());

    if (!response.ok) {
      if (response.status === 404) {
        return { site: null, error: 'unknown_site' };
      }
      return { site: null, error: 'verification_failed' };
    }

    const site = await response.json<SiteConfig>();
    if (site.hostname !== session.hostname) {
      return { site: null, error: 'session_mismatch' };
    }

    return { site, error: null };
  }

  // No SAT and no session
  return { site: null, error: 'unauthorized' };
}

/**
 * Authenticate receipts API request using either site_session cookie OR Authorization: Bearer <SAT> header
 * Returns { site, error } - site is null if auth fails
 */
async function authenticateReceiptsRequest(request: Request, env: Env): Promise<{ site: SiteConfig | null; error: string | null }> {
  // First, try SAT or site_session without using Host header
  const { site, error } = await resolveSiteForReceipts(request, env);
  if (site) {
    return { site, error: null };
  }

  // If no SAT/session match, allow demo/local hosts to access receipts by hostname
  const url = new URL(request.url);
  const hostHeader = request.headers.get('Host') || url.host;
  const requestHost = normalizeHostHeader(hostHeader);

  const { site: hostSite, error: hostError } = await getSiteConfig(request, env);
  if (!hostSite) {
    return { site: null, error: hostError || error || 'unknown_site' };
  }

  if (isDemoHost(requestHost) || hostSite.siteId === 'demo-workers-dev' || hostSite.siteId === 'local-dev' || isLocalDevHost(requestHost)) {
    return { site: hostSite, error: null };
  }

  return { site: null, error: error || 'unauthorized' };
}

/**
 * Check if hostname is a demo host (localhost or workers.dev)
 */
function isDemoHost(hostname: string): boolean {
  const h = normalizeHostHeader(hostname);
  return h === '127.0.0.1' ||
         h === 'localhost' ||
         h.endsWith('.workers.dev');
}

/**
 * Add security headers to HTML responses
 */
function addSecurityHeaders(response: Response, turnstileSiteKey?: string): Response {
  // Build CSP: allow inline scripts (for signature computation) and Turnstile if enabled
  let csp = "default-src 'self'; script-src 'self' 'unsafe-inline'";
  if (turnstileSiteKey) {
    csp += " https://challenges.cloudflare.com";
  }
  csp += "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'";
  if (turnstileSiteKey) {
    csp += " https://challenges.cloudflare.com";
  }
  csp += "; frame-src 'self'";
  if (turnstileSiteKey) {
    csp += " https://challenges.cloudflare.com";
  }
  csp += "; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
  
  // Clone response and add headers
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Content-Security-Policy', csp);
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('Referrer-Policy', 'no-referrer');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Build a secure cookie string with conditional Secure flag
 * Secure flag is only set if HTTPS and not localhost
 */
function buildSecureCookie(name: string, value: string, maxAge: number, request: Request): string {
  const url = new URL(request.url);
  const isHttps = url.protocol === 'https:';
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  
  const secureFlag = (isHttps && !isLocalhost) ? '; Secure' : '';
  
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`;
}

/**
 * Build a cookie clearing string with conditional Secure flag
 */
function buildClearCookie(name: string, request: Request): string {
  const url = new URL(request.url);
  const isHttps = url.protocol === 'https:';
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  
  const secureFlag = (isHttps && !isLocalhost) ? '; Secure' : '';
  
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
}

/**
 * Check rate limit for an IP address
 */
async function checkRateLimit(env: Env, siteId: string, ip: string, phase: 'A' | 'B'): Promise<{ allowed: boolean; remaining: number }> {
  const stub = getGuardStub(env);
  const rateLimitUrl = new URL('/rate-limit', 'http://internal');
  rateLimitUrl.searchParams.set('siteId', siteId);
  rateLimitUrl.searchParams.set('ip', ip);
  rateLimitUrl.searchParams.set('phase', phase);
  
  const response = await stub.fetch(rateLimitUrl.toString());
  if (!response.ok) {
    // If rate limit check fails, allow the request (fail open)
    return { allowed: true, remaining: 100 };
  }
  
  const result = await response.json<{ allowed: boolean; remaining: number }>();
  return result;
}

// Startup check for local dev: warn if ADMIN_API_KEY is missing
function checkLocalDevConfig(request: Request, env: Env): void {
  const url = new URL(request.url);
  const hostHeader = request.headers.get('Host') || url.host;
  const hostname = normalizeHostHeader(hostHeader);
  const isLocalDev = isLocalDevHost(hostname);
  
  if (isLocalDev && !env.ADMIN_API_KEY) {
    // Log warning to console (visible in wrangler dev output)
    console.warn('');
    console.warn('⚠️  ADMIN_API_KEY missing: create .dev.vars with ADMIN_API_KEY=... and restart wrangler dev');
    console.warn('');
  }
}

/**
 * Production hardening: fail-fast on invalid configuration
 */
function validateProductionConfig(env: Env): void {
  const isProduction = env.ENV === 'production';
  
  if (!isProduction) {
    return; // Skip validation in dev
  }
  
  const configErrors: string[] = [];
  
  // Assert TOKEN_REFRESH_MUTEX binding exists
  if (!env.TOKEN_REFRESH_MUTEX) {
    configErrors.push('TOKEN_REFRESH_MUTEX binding is required in production');
  }
  
  // Check key material
  if (!env.EIG_PRIVATE_KEY) {
    configErrors.push('EIG_PRIVATE_KEY missing (required for signing attestations)');
  }
  if (!env.EIG_KEY_ID) {
    configErrors.push('EIG_KEY_ID missing (required for signing attestations)');
  }
  if (!env.EIG_PUBLIC_KEY_JWK) {
    configErrors.push('EIG_PUBLIC_KEY_JWK missing (required for JWKS endpoint)');
  }
  
  // Check Turnstile keys
  if (!env.TURNSTILE_SECRET_KEY) {
    configErrors.push('TURNSTILE_SECRET_KEY missing (required in production)');
  }
  if (!env.TURNSTILE_SITE_KEY) {
    configErrors.push('TURNSTILE_SITE_KEY missing (required in production)');
  }
  
  // Assert DEV_BYPASS is impossible in prod
  if (env.ENV === 'production' && env.TURNSTILE_SECRET_KEY === 'DEV_BYPASS') {
    configErrors.push('DEV_BYPASS cannot be used in production');
  }
  
  if (configErrors.length > 0) {
    const errorMsg = `Production configuration invalid:\n${configErrors.map(e => `  - ${e}`).join('\n')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Global flag to ensure validation runs once
let productionConfigValidated = false;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Validate production config on first request (fail-fast)
    if (!productionConfigValidated) {
      validateProductionConfig(env);
      productionConfigValidated = true;
    }

    // Handle cron trigger for delivery processing
    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === '/cron/deliveries' && request.method === 'POST') {
      const cronSecret = request.headers.get('X-Cron-Secret');
      const expectedSecret = (env as any).CRON_SECRET;
      
      // Verify cron secret (if configured)
      if (expectedSecret && cronSecret !== expectedSecret) {
        return new Response('Unauthorized', { status: 401 });
      }

      const result = await handleCronDeliveries(env);
      return new Response(
        JSON.stringify({
          success: true,
          processed: result.processed,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check local dev config on first request
    checkLocalDevConfig(request, env);
    
    const url = new URL(request.url);
    const path = url.pathname;

    // Admin endpoints: require auth before routing
    if (path.startsWith('/admin')) {
      // Calculate hasKey and keyLen for diagnostics
      const hasKey = typeof env.ADMIN_API_KEY === 'string' && env.ADMIN_API_KEY.length > 0;
      const keyLen = env.ADMIN_API_KEY ? env.ADMIN_API_KEY.length : 0;
      
      // Log once per /admin request in local dev
      const hostname = url.host;
      const isLocalDev = hostname === '127.0.0.1:8787' || 
                         hostname.startsWith('127.0.0.1') || 
                         hostname.startsWith('localhost');
      if (isLocalDev) {
        console.log('[admin] hasKey=', hasKey, 'keyLen=', keyLen);
      }
      
      // Special case: /admin/domain/check can skip auth in dev/local
      const isDomainCheck = path === '/admin/domain/check' && request.method === 'GET';
      const isDev = env.ENV === 'dev' || isLocalDev || env.TURNSTILE_ENABLED === 'false';
      const skipAuth = isDomainCheck && isDev;
      
      if (!skipAuth) {
        // Check if ADMIN_API_KEY is configured
        if (!env.ADMIN_API_KEY) {
          return new Response(JSON.stringify({ error: 'missing_admin_api_key' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        // Validate Authorization header: "Bearer <key>"
        const authHeader = request.headers.get('Authorization');
        const apiKey = authHeader?.replace('Bearer ', '');
        
        if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      
      // Auth passed - route to admin handlers
      // GET /admin/ping - Health check
      if (path === '/admin/ping' && request.method === 'GET') {
        return new Response(JSON.stringify({ 
          ok: true, 
          hasKey: hasKey,
          keyLen: keyLen
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // EIG Admin routes
      if (path === '/admin/hubspot/install' && request.method === 'GET') {
        return handleHubSpotInstall(request, env);
      }
      
      if (path === '/admin/hubspot/callback' && request.method === 'GET') {
        return handleHubSpotCallback(request, env);
      }
      
      const recipeMatch = path.match(/^\/admin\/recipes\/([ABC])\/enable$/);
      if (recipeMatch && request.method === 'POST') {
        return handleRecipeEnable(request, env, recipeMatch[1]);
      }
      
      if (path === '/admin/domain/check' && request.method === 'GET') {
        return handleDomainCheck(request, env);
      }
      
      if (path === '/admin/seed-domain' && request.method === 'POST') {
        return handleSeedDomain(request, env);
      }
      
      if (path === '/admin/workflows' && request.method === 'GET') {
        return handleListWorkflows(request, env);
      }
      
      if (path === '/admin/status' && request.method === 'GET') {
        return handleStatus(request, env);
      }
      
      // All other /admin/* routes
      if (path.startsWith('/admin/sites')) {
        return handleAdminSites(request, env);
      }
      
      // Unknown admin route
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // EIG V1 Routes
    // GET /health - Health check
    if (path === '/health' && request.method === 'GET') {
      return handleHealth();
    }

    // GET /.well-known/jwks.json - Public keys for verification
    if (path === '/.well-known/jwks.json' && request.method === 'GET') {
      return handleJWKS(env);
    }

    // POST /verify - Verify attestation signature
    if (path === '/verify' && request.method === 'POST') {
      return handleVerify(request, env);
    }

    // Live Inbox Test: POST /test/send, GET /test/control, GET /test/status
    if (path === '/test/send') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      if (request.method === 'POST') {
        try {
          const missing: string[] = [];
          if (!env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
          if (!env.TEST_FROM_EMAIL) missing.push('TEST_FROM_EMAIL');
          if (!env.EIG_DB) missing.push('EIG_DB');
          if (missing.length > 0) {
            return addCors(new Response(JSON.stringify({ ok: false, error: 'Missing required config', missing }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }));
          }
          const cloned = request.clone();
          let raw: string;
          try {
            raw = await cloned.text();
          } catch (e) {
            return addCors(new Response(JSON.stringify({ ok: false, error: 'Invalid JSON', detail: String(e) }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }));
          }
          try {
            JSON.parse(raw);
          } catch (e) {
            return addCors(new Response(JSON.stringify({
              ok: false,
              error: 'Invalid JSON',
              detail: String(e),
              rawLength: raw.length,
              rawPreview: raw.slice(0, 80),
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }));
          }
          const railBase = `${url.protocol}//${url.host}`;
          const res = await handleTestSend(request, env, railBase);
          return addCors(res);
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          return addCors(new Response(JSON.stringify({
            ok: false,
            error: 'Unhandled error',
            detail: String(e),
            stack: err?.stack?.toString?.() ?? null,
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }));
        }
      }
    }
    if (path === '/test/control' && request.method === 'GET') {
      return handleTestControl(request, env);
    }
    if (path === '/test/status' && request.method === 'GET') {
      return handleTestStatus(request, env);
    }

    // Auth Link Scanner Immunity Rail: GET /r/:rid (safe), POST /redeem (only spend path)
    if (path === '/redeem' && request.method === 'POST') {
      return handlePostRedeem(request, env);
    }

    const rRidMatch = path.match(/^\/r\/([^\/]+)$/);
    if (rRidMatch && request.method === 'GET') {
      const rid = rRidMatch[1];
      return handleGetRail(request, env, rid);
    }

    // Debug endpoints: disabled unless localhost/127.0.0.1
    if (path.startsWith('/debug')) {
      const hostname = normalizeHostHeader(request.headers.get('Host') || url.host);
      if (!isLocalDevHost(hostname)) {
        return new Response('Not Found', { status: 404 });
      }
    }

    // Homepage: GET / - Landing page with demo link
    if (path === '/' && request.method === 'GET') {
      return handleHomepage(request, env);
    }

    // Phase A: GET /l/* - Return scanner-safe interstitial
    if (path.startsWith('/l/') && request.method === 'GET') {
      return handleInterstitial(request, env);
    }

    // Phase B: POST /v/:nonce - Validate and redeem nonce
    // Strict guard: reject any non-POST method with 405
    if (path.startsWith('/v/')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ 
          error: 'Method not allowed', 
          reason: 'method_not_allowed',
          allowed: ['POST']
        }), { 
          status: 405,
          headers: { 
            'Content-Type': 'application/json',
            'Allow': 'POST'
          }
        });
      }
      return handleValidate(request, env);
    }

    // Receipts: GET /receipts - Receipts UI page (moved from /r to avoid conflict)
    if (path === '/receipts' && request.method === 'GET') {
      return handleReceiptsUI(request, env);
    }

    // Legacy receipts routes (kept for backward compatibility)
    if (path === '/r' && request.method === 'GET' && !rRidMatch) {
      return handleReceiptsUI(request, env);
    }

    // Receipts: GET /r/events - Get recent events
    if (path === '/r/events' && request.method === 'GET') {
      return handleGetEvents(request, env);
    }

    // Receipts: GET /r/export - Export events as JSON file
    if (path === '/r/export' && request.method === 'GET') {
      return handleExportEvents(request, env);
    }

    // Receipts: GET /r/export.json - Export events as JSON (authenticated, with filters)
    if (path === '/r/export.json' && request.method === 'GET') {
      return handleExportEventsJSON(request, env);
    }

    // Receipts: GET /r/summary.json - Get summary counters and rates
    if (path === '/r/summary.json' && request.method === 'GET') {
      return handleSummaryJSON(request, env);
    }

    // Receipts: GET /r/policy.json - Get effective site policy (SAT-scoped)
    if (path === '/r/policy.json' && request.method === 'GET') {
      return handlePolicyJSON(request, env);
    }

    // Debug: GET /debug/sig?nonce=... - Get signature debug info (dev only)
    if (path === '/debug/sig' && request.method === 'GET') {
      return handleDebugSig(request, env);
    }

    // Demo origin endpoint: GET /demo/consume - Demo token consumption page
    if (path === '/demo/consume' && request.method === 'GET') {
      return handleDemoConsume(request, env);
    }

    // Admin API routes are handled above (before this point)

    // Dashboard: GET /app - Dashboard UI (requires SAT login)
    if (path === '/app' && request.method === 'GET') {
      return handleDashboard(request, env);
    }

    // Dashboard: POST /app/login - Login with SAT
    if (path === '/app/login' && request.method === 'POST') {
      return handleDashboardLogin(request, env);
    }

    // Dashboard: POST /app/logout - Logout and clear session
    if (path === '/app/logout' && request.method === 'POST') {
      return handleDashboardLogout(request, env);
    }

    // Dashboard: GET /app/counters - Get event counters (last 24h)
    if (path === '/app/counters' && request.method === 'GET') {
      return handleDashboardCounters(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Get the effective ORIGIN_BASE_URL, handling workers.dev auto-detection
 */
function getOriginBaseUrl(request: Request, env: Env): string {
  const requestUrl = new URL(request.url);
  const host = requestUrl.host;

  // If deployed on workers.dev, always redirect back to the same worker origin
  if (host.endsWith('.workers.dev')) {
    return `${requestUrl.protocol}//${requestUrl.host}`;
  }

  // Local dev: allow env.ORIGIN_BASE_URL (often localhost/127.0.0.1)
  if (host.includes('127.0.0.1') || host.includes('localhost')) {
    return env.ORIGIN_BASE_URL;
  }

  // Custom domains / production: use explicit ORIGIN_BASE_URL from env
  return env.ORIGIN_BASE_URL;
}

async function handleHomepage(request: Request, env: Env): Promise<Response> {
  // This function will return HTML, we'll add security headers at the end
  const url = new URL(request.url);
  const liveOrigin = `${url.protocol}//${url.host}`;
  const beforeUrl = 'https://YOURAPP.com/auth/verify?token=XYZ&type=magiclink';
  const afterUrl = `${liveOrigin}/l/auth/verify?token=XYZ&type=magiclink`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scanner-Safe One-Time Links</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 0;
      background:
        radial-gradient(1200px 600px at 20% 10%, rgba(102,126,234,0.35), transparent 60%),
        radial-gradient(900px 500px at 80% 0%, rgba(118,75,162,0.28), transparent 60%),
        #0b1020;
      color: #0b1020;
      min-height: 100vh;
    }
    .container {
      max-width: 980px;
      margin: 0 auto;
      padding: 56px 20px;
    }
    .card {
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      overflow: hidden;
    }
    .hero {
      padding: 42px 40px 28px 40px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      background: linear-gradient(180deg, rgba(102,126,234,0.10), rgba(118,75,162,0.06));
    }
    h1 {
      margin: 0 0 10px 0;
      font-size: 34px;
      letter-spacing: -0.3px;
      line-height: 1.15;
      color: #0b1020;
    }
    .subtitle {
      margin: 0 0 18px 0;
      font-size: 16px;
      line-height: 1.6;
      color: rgba(11,16,32,0.72);
    }
    .bullets {
      margin: 0;
      padding: 0 0 0 18px;
      color: rgba(11,16,32,0.75);
      line-height: 1.7;
      font-size: 15px;
    }
    .bullets li { margin: 6px 0; }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 18px;
      flex-wrap: wrap;
    }
    a {
      display: inline-block;
      padding: 11px 16px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    }
    a:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.7);
      color: #0b1020;
      border: 1px solid rgba(11,16,32,0.12);
    }
    .sections {
      padding: 26px 40px 38px 40px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
    }
    .section {
      padding: 18px;
      border: 1px solid rgba(11,16,32,0.10);
      border-radius: 12px;
      background: rgba(255,255,255,0.65);
    }
    .section h2 {
      margin: 0 0 10px 0;
      font-size: 14px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(11,16,32,0.62);
    }
    .section p {
      margin: 0;
      color: rgba(11,16,32,0.78);
      line-height: 1.65;
      font-size: 14px;
    }
    .snippets {
      margin-top: 10px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .snippet {
      border: 1px solid rgba(11,16,32,0.10);
      background: rgba(11,16,32,0.04);
      border-radius: 10px;
      padding: 12px;
      overflow: hidden;
    }
    .snippet .label {
      font-size: 12px;
      font-weight: 700;
      color: rgba(11,16,32,0.70);
      margin-bottom: 8px;
    }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      color: rgba(11,16,32,0.88);
      font-size: 13px;
      line-height: 1.5;
    }
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: rgba(11,16,32,0.55);
      line-height: 1.5;
    }
    @media (min-width: 900px) {
      .sections { grid-template-columns: 1.2fr 0.8fr; align-items: start; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="hero">
        <h1>Scanner-Safe One-Time Links</h1>
        <p class="subtitle">Email security scanners can preview links, but never redeem the token.</p>
        <ul class="bullets">
          <li>GET previews are inert (scanner-safe)</li>
          <li>Only a real browser can complete redemption (cookie + JS signature)</li>
          <li>Receipts prove every scanner hit and every blocked replay/expiry</li>
        </ul>
        <div class="actions">
          <a href="/l/demo/consume?token=hello123" class="btn-primary">Try live demo</a>
          <a href="/r" class="btn-secondary">View receipts</a>
        </div>
      </div>

      <div class="sections">
        <div class="section">
          <h2>Install</h2>
          <p>Replace your one-time origin link with a protected link that routes through this Worker.</p>
          <div class="snippets">
            <div class="snippet">
              <div class="label">Before (origin link)</div>
              <pre>${beforeUrl}</pre>
            </div>
            <div class="snippet">
              <div class="label">After (protected link)</div>
              <pre>${afterUrl}</pre>
            </div>
          </div>
          <div class="hint">This page is running on <code>${liveOrigin}</code>, so the “After” example is already using the live domain.</div>
        </div>

        <div class="section">
          <h2>Why this exists</h2>
          <p>Proofpoint, Mimecast, and Microsoft Defender frequently prefetch email links and can accidentally consume one-time tokens before a user clicks. This Worker uses a two-phase model: a scanner-safe interstitial (Phase A) mints a nonce, and only a real browser can redeem it (Phase B) to reach the origin.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

async function handleInterstitial(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const linkPath = url.pathname.substring(3); // Remove '/l/' prefix
  const requestHost = normalizeHostHeader(request.headers.get('Host') || url.host);
  
  // Load site config by hostname
  const { site, error: siteError } = await getSiteConfig(request, env);
  if (!site) {
    // Log denied event for unknown site
    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || undefined;
    const stub = getGuardStub(env);
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'denied');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', `unknown_site: ${requestHost}`);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
    
    return new Response(JSON.stringify({ error: 'unknown_site' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Extract IP and User-Agent for logging
  const ip = getClientIP(request);
  const ua = request.headers.get('User-Agent') || undefined;
  
  // Get or create continuity cookie
  const continuityId = getOrCreateContinuityId(request);
  
  // Get global Durable Object stub for logging
  const stub = getGuardStub(env);
  
  // Redirect safety: Check for protocol injection attempts
  const decodedPath = decodeURIComponent(linkPath);
  if (decodedPath.includes('://') || decodedPath.includes('//') || linkPath.includes('%2f%2f') || linkPath.includes('%3a%2f%2f')) {
    // Log denied event
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'denied');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', 'path_not_allowed: protocol_injection');
    logUrl.searchParams.set('siteId', site.siteId);
    logUrl.searchParams.set('hostname', requestHost);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
    
    return new Response('Not Found', { status: 404 });
  }
  
  // Ensure linkPath starts with / (it should after removing '/l/')
  const normalizedPath = linkPath.startsWith('/') ? linkPath : `/${linkPath}`;
  
  // Dev-only TTL override: Check request host for local dev
  const isLocalDev = isLocalDevHost(requestHost);
  const isWorkersDev = requestHost.endsWith('.workers.dev');
  
  // Redirect safety: Check path allowlist (use site config only, no env fallback)
  let pathAllowlist = site.pathAllowlist;
  if (pathAllowlist.length === 0) {
    if (isLocalDev) {
      const envAllow = (env.PATH_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);
      pathAllowlist = envAllow.length > 0 ? envAllow : ['/auth', '/reset', '/verify', '/invite', '/magic'];
    } else {
      pathAllowlist = [];
    }
  }
  // Add /demo for local dev or workers.dev demo site
  if (isLocalDev || isWorkersDev) {
    if (!pathAllowlist.includes('/demo')) {
      pathAllowlist = [...pathAllowlist, '/demo'];
    }
  }
  // Only allow exact prefix or prefix followed by '/'
  const isPathAllowed = pathAllowlist.some(rawPrefix => {
    if (!rawPrefix) return false;
    const prefix = rawPrefix.startsWith('/') ? rawPrefix : `/${rawPrefix}`;
    return normalizedPath === prefix || normalizedPath.startsWith(prefix + '/');
  });
  
  if (!isPathAllowed) {
    // Log denied event
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'denied');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', 'path_not_allowed');
    logUrl.searchParams.set('siteId', site.siteId);
    logUrl.searchParams.set('hostname', requestHost);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
    
    return new Response('Not Found', { status: 404 });
  }
  
  // Extract and validate TTL override (dev only)
  let ttlMs: number | undefined = undefined;
  if (isLocalDev) {
    const ttlOverride = url.searchParams.get('__ttl_ms');
    if (ttlOverride) {
      const parsed = parseInt(ttlOverride, 10);
      if (!isNaN(parsed) && parsed > 0) {
        // Clamp to [50, 300000] (50ms to 5 minutes)
        ttlMs = Math.max(50, Math.min(300000, parsed));
      }
    }
  }
  
  // Redirect safety: Filter query parameters to allowlist only
  // Explicitly exclude __ttl_ms from forwarded params
  // Use site config only (no env fallback)
  let queryAllowlist = site.queryAllowlist;
  if (queryAllowlist.length === 0 && isLocalDev) {
    const envAllow = (env.QUERY_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);
    queryAllowlist = envAllow.length > 0 ? envAllow : ['token', 'type', 'redirect_to', 'next', 'state'];
  }
  const filteredParams = new URLSearchParams();
  let queryDropped = false;
  
  for (const [key, value] of url.searchParams.entries()) {
    // Always exclude __ttl_ms (dev-only param, never forward)
    if (key === '__ttl_ms') {
      queryDropped = true;
      continue;
    }
    if (queryAllowlist.includes(key)) {
      filteredParams.append(key, value);
    } else {
      queryDropped = true;
    }
  }
  
  // Log if query params were dropped
  if (queryDropped) {
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'denied');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', 'query_dropped');
    logUrl.searchParams.set('siteId', site.siteId);
    logUrl.searchParams.set('hostname', requestHost);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
  }

  // Prevent open redirect via redirect_to/next/state when value is a full URL to a different host
  const redirectKeys = ['redirect_to', 'next', 'state'];
  let originHost = '';
  try {
    originHost = normalizeHostHeader(new URL(site.originBaseUrl).host);
  } catch {
    originHost = '';
  }
  if (originHost) {
    for (const key of redirectKeys) {
      const value = filteredParams.get(key);
      if (!value) continue;
      const trimmed = value.trim();
      if (!trimmed) continue;

      // Only treat absolute http(s) URLs as candidates
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
          const targetUrl = new URL(trimmed);
          const targetHost = normalizeHostHeader(targetUrl.host);
          if (targetHost && targetHost !== originHost) {
            const logUrl = new URL('/log-event', request.url);
            logUrl.searchParams.set('nonce', 'denied');
            logUrl.searchParams.set('action', 'denied');
            logUrl.searchParams.set('note', 'open_redirect_blocked');
            logUrl.searchParams.set('siteId', site.siteId);
            logUrl.searchParams.set('hostname', requestHost);
            if (ip) logUrl.searchParams.set('ip', ip);
            if (ua) logUrl.searchParams.set('ua', ua);
            stub.fetch(logUrl.toString()).catch(() => {});

            return new Response('Not Found', { status: 404 });
          }
        } catch {
          // If not a valid URL, treat as non-host-based value and allow
        }
      }
    }
  }
  
  // Check rate limit for Phase A
  const rateLimit = await checkRateLimit(env, site.siteId, ip || 'unknown', 'A');
  if (!rateLimit.allowed) {
    // Log rate limited event
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'rate_limited');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', 'rate_limited: phase_a');
    logUrl.searchParams.set('siteId', site.siteId);
    logUrl.searchParams.set('hostname', requestHost);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
    
    return new Response(JSON.stringify({ error: 'Rate limit exceeded', reason: 'rate_limited' }), {
      status: 429,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    });
  }

  // Construct origin URL: site.originBaseUrl + "/<rest>" + filtered query string
  // Handle originBaseUrl with or without trailing slash
  // CRITICAL: Never use user input directly - always construct from site.originBaseUrl + normalizedPath
  const baseUrl = site.originBaseUrl.endsWith('/') 
    ? site.originBaseUrl.slice(0, -1) 
    : site.originBaseUrl;
  
  // Additional safety: ensure normalizedPath doesn't contain protocol indicators
  // (already checked above, but defense in depth)
  if (normalizedPath.includes('://') || normalizedPath.includes('%3a%2f%2f')) {
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'denied');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', 'path_not_allowed: protocol_injection_final');
    logUrl.searchParams.set('siteId', site.siteId);
    logUrl.searchParams.set('hostname', requestHost);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
    return new Response('Not Found', { status: 404 });
  }
  
  const filteredQuery = filteredParams.toString();
  // Construct URL safely: baseUrl (from site config) + normalizedPath (validated) + query (filtered)
  const originUrl = `${baseUrl}${normalizedPath}${filteredQuery ? '?' + filteredQuery : ''}`;

  // Lightweight bot heuristics (logging only, no blocking)
  const notes: string[] = [];
  const isLikelyScanner = detectScannerUA(ua);
  if (isLikelyScanner) {
    notes.push('likely_scanner');
  }

  // Check if Turnstile should be shown (use site config, fallback to env)
  const turnstileEnabled = site.turnstileEnabled || (env.TURNSTILE_ENABLED === 'true' || env.TURNSTILE_ENABLED === '1');
  const turnstileSiteKey = site.turnstileSiteKey || env.TURNSTILE_SITE_KEY;
  const showTurnstile = turnstileEnabled && isLikelyScanner && turnstileSiteKey;

  // Generate proofSeed for signature computation (lowercase hex string, no dashes)
  const proofSeed = generateRandomHex(16);

  // Mint nonce in DO
  const mintUrl = new URL('/mint', request.url);
  mintUrl.searchParams.set('originUrl', originUrl);
  mintUrl.searchParams.set('continuityId', continuityId);
  mintUrl.searchParams.set('proofSeed', proofSeed); // Store proofSeed for debugging
  mintUrl.searchParams.set('siteId', site.siteId);
  mintUrl.searchParams.set('hostname', requestHost);
  if (ip) mintUrl.searchParams.set('ip', ip);
  if (ua) mintUrl.searchParams.set('ua', ua);
  if (notes.length > 0) mintUrl.searchParams.set('note', notes.join(','));
  
  // Pass TTL override to DO (only if set and in local dev)
  if (ttlMs !== undefined) {
    mintUrl.searchParams.set('__ttl_ms', ttlMs.toString());
  }
  
  const mintResponse = await stub.fetch(mintUrl.toString());
  
  if (!mintResponse.ok) {
    return new Response('Failed to mint nonce', { status: 500 });
  }

  const { nonce } = await mintResponse.json<{ nonce: string }>();

  // Return interstitial HTML (signature will be computed in browser)
  const html = generateInterstitialHTML(nonce, originUrl, continuityId, proofSeed, showTurnstile ? turnstileSiteKey : undefined);

  // Cookie expires in 10 minutes (600 seconds)
  const cookieString = buildSecureCookie('continuity', continuityId, 600, request);
  const response = new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Set-Cookie': cookieString,
    },
  });

  // Add security headers
  return addSecurityHeaders(response, showTurnstile ? turnstileSiteKey : undefined);
}

async function handleValidate(request: Request, env: Env): Promise<Response> {
  // Method check is already done at route level, but keep as defense in depth
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed', reason: 'method_not_allowed' }), { 
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Allow': 'POST'
      }
    });
  }

  // Load site config by hostname
  const { site, error: siteError } = await getSiteConfig(request, env);
  if (!site) {
    const url = new URL(request.url);
    const requestHost = normalizeHostHeader(request.headers.get('Host') || url.host);
    // Log denied event for unknown site
    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || undefined;
    const stub = getGuardStub(env);
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'denied');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', `unknown_site: ${requestHost}`);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
    
    // Return JSON for API route
    return new Response(JSON.stringify({ error: 'unknown_site' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const url = new URL(request.url);
  const requestHost = normalizeHostHeader(request.headers.get('Host') || url.host);

  // Check rate limit for Phase B
  const ip = getClientIP(request);
  const rateLimit = await checkRateLimit(env, site.siteId, ip || 'unknown', 'B');
  if (!rateLimit.allowed) {
    // Log rate limited event
    const stub = getGuardStub(env);
    const ua = request.headers.get('User-Agent') || undefined;
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'rate_limited');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', 'rate_limited: phase_b');
    logUrl.searchParams.set('siteId', site.siteId);
    logUrl.searchParams.set('hostname', requestHost);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
    
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    });
  }

  const nonce = url.pathname.substring(3); // Remove '/v/' prefix

  if (!nonce) {
    return new Response(JSON.stringify({ error: 'Missing nonce', reason: 'missing_nonce' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get form data
  const formData = await request.formData();
  const providedSignature = formData.get('signature') as string | null;

  if (!providedSignature) {
    return new Response(JSON.stringify({ error: 'Missing signature', reason: 'missing_signature' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get proofSeed from form data
  const proofSeed = formData.get('proofSeed') as string | null;
  if (!proofSeed) {
    return new Response(JSON.stringify({ error: 'Missing proofSeed', reason: 'missing_proofseed' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get continuity ID for signature validation
  const continuityId = getContinuityId(request);
  if (!continuityId) {
    return new Response(JSON.stringify({ error: 'Missing continuity cookie', reason: 'missing_session_cookie' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate signature: sha256hex(sessionId + ":" + nonce + ":" + proofSeed)
  const expectedSignature = await generateSignature(continuityId, nonce, proofSeed);
  if (providedSignature !== expectedSignature) {
    return new Response(JSON.stringify({ error: 'Invalid signature', reason: 'bad_sig' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate Turnstile token if enabled (use site config, fallback to env)
  const turnstileEnabled = site.turnstileEnabled || (env.TURNSTILE_ENABLED === 'true' || env.TURNSTILE_ENABLED === '1');
  if (turnstileEnabled && env.TURNSTILE_SECRET_KEY) {
    const turnstileToken = formData.get('turnstile-token') as string | null;
    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: 'Missing Turnstile token', reason: 'missing_turnstile' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify Turnstile token with Cloudflare API
    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: getClientIP(request),
      }),
    });

    const turnstileResult = await turnstileResponse.json<{ success: boolean; 'error-codes'?: string[] }>();
    if (!turnstileResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Turnstile verification failed', 
        reason: 'turnstile_failed',
        details: turnstileResult['error-codes'] 
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Extract IP and User-Agent (ip already declared above for rate limiting)
  const ua = request.headers.get('User-Agent') || undefined;

  // Lightweight bot heuristics (logging only, no blocking)
  const notes: string[] = [];
  if (!continuityId) {
    notes.push('no_cookie');
  }
  
  if (notes.length > 0) {
    // Log the event even without cookie (use global DO instance)
    const stub = getGuardStub(env);
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', nonce);
    logUrl.searchParams.set('action', 'expired');
    logUrl.searchParams.set('note', notes.join(','));
    logUrl.searchParams.set('siteId', site.siteId);
    logUrl.searchParams.set('hostname', requestHost);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {}); // Fire and forget
  }
  
  if (!continuityId) {
    return new Response(JSON.stringify({ error: 'Missing continuity cookie', reason: 'missing_session_cookie' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get global Durable Object stub (all operations use same instance)
  const stub = getGuardStub(env);

  const redeemUrl = new URL('/redeem', request.url);
  redeemUrl.searchParams.set('nonce', nonce);
  redeemUrl.searchParams.set('continuityId', continuityId);
  redeemUrl.searchParams.set('siteId', site.siteId);
  redeemUrl.searchParams.set('hostname', requestHost);
  if (ip) redeemUrl.searchParams.set('ip', ip);
  if (ua) redeemUrl.searchParams.set('ua', ua);
  if (notes.length > 0) redeemUrl.searchParams.set('note', notes.join(','));
  const redeemResponse = await stub.fetch(redeemUrl.toString());

  if (!redeemResponse.ok) {
    // Return the error response from DO (which already has reason codes)
    return redeemResponse;
  }

  const { originUrl } = await redeemResponse.json<{ originUrl: string }>();

  // Decide response format: JSON only when explicitly requested
  const accept = request.headers.get('Accept') || '';
  const wantsJson =
    accept.includes('application/json') || url.searchParams.get('mode') === 'json';

  if (wantsJson) {
    return new Response(
      JSON.stringify({ ok: true, redirectTo: originUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Default for browsers and other clients: 303 redirect to originUrl
  return new Response(null, {
    status: 303,
    headers: {
      Location: originUrl,
    },
  });
}

async function handleReceiptsUI(request: Request, env: Env): Promise<Response> {
  // Load site config by hostname
  const { site, error: siteError } = await getSiteConfig(request, env);
  if (!site) {
    // Log denied event for unknown site
    const url = new URL(request.url);
    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || undefined;
    const stub = getGuardStub(env);
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'denied');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', `unknown_site: ${url.host}`);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
    
    return new Response('Not Found', { status: 404 });
  }
  
  // For demo hosts and local dev, allow public access
  // For real sites, require SAT login
  const url = new URL(request.url);
  const hostname = url.host;
  const isLocalDev = isLocalDevHost(hostname);
  
  if (!isDemoHost(hostname) && site.siteId !== 'demo-workers-dev' && site.siteId !== 'local-dev' && !isLocalDev) {
    // Check for site session
    const session = getSiteSession(request);
    if (!session || session.siteId !== site.siteId) {
      // Redirect to /app for login
      const redirectUrl = new URL('/app', request.url).toString();
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }
  }
  
  const html = generateReceiptsHTML();
  const response = new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
  return addSecurityHeaders(response);
}

async function handleGetEvents(request: Request, env: Env): Promise<Response> {
  // Authenticate using SAT header or session cookie
  const { site, error: authError } = await authenticateReceiptsRequest(request, env);
  if (!site) {
    if (authError === 'unknown_site') {
      // Log denied event for unknown site
      const url = new URL(request.url);
      const ip = getClientIP(request);
      const ua = request.headers.get('User-Agent') || undefined;
      const stub = getGuardStub(env);
      const logUrl = new URL('/log-event', request.url);
      logUrl.searchParams.set('nonce', 'denied');
      logUrl.searchParams.set('action', 'denied');
      logUrl.searchParams.set('note', `unknown_site: ${url.host}`);
      if (ip) logUrl.searchParams.set('ip', ip);
      if (ua) logUrl.searchParams.set('ua', ua);
      stub.fetch(logUrl.toString()).catch(() => {});
      
      return new Response(JSON.stringify({ error: 'unknown_site' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Get global Durable Object stub (all operations use same instance)
  const stub = getGuardStub(env);

  // Pass through query parameters (limit, type, since, until) from original request
  const requestUrl = new URL(request.url);
  const eventsUrl = new URL('/events', request.url);
  // Copy query parameters from original request
  requestUrl.searchParams.forEach((value, key) => {
    eventsUrl.searchParams.set(key, value);
  });
  
  // Always add siteId to filter events
  eventsUrl.searchParams.set('siteId', site.siteId);

  const eventsResponse = await stub.fetch(eventsUrl.toString());

  if (!eventsResponse.ok) {
    return new Response('Failed to get events', { status: 500 });
  }

  return eventsResponse;
}

async function handleExportEvents(request: Request, env: Env): Promise<Response> {
  // Load site config by hostname
  const { site, error: siteError } = await getSiteConfig(request, env);
  if (!site) {
    // Log denied event for unknown site
    const url = new URL(request.url);
    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || undefined;
    const stub = getGuardStub(env);
    const logUrl = new URL('/log-event', request.url);
    logUrl.searchParams.set('nonce', 'denied');
    logUrl.searchParams.set('action', 'denied');
    logUrl.searchParams.set('note', `unknown_site: ${url.host}`);
    if (ip) logUrl.searchParams.set('ip', ip);
    if (ua) logUrl.searchParams.set('ua', ua);
    stub.fetch(logUrl.toString()).catch(() => {});
    
    return new Response(JSON.stringify({ error: 'unknown_site' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // For demo hosts and local dev, allow public access
  // For real sites, require SAT login
  const url = new URL(request.url);
  const hostname = url.host;
  const isLocalDev = isLocalDevHost(hostname);
  
  if (!isDemoHost(hostname) && site.siteId !== 'demo-workers-dev' && site.siteId !== 'local-dev' && !isLocalDev) {
    const session = getSiteSession(request);
    if (!session || session.siteId !== site.siteId) {
      // Redirect to /app for login
      const redirectUrl = new URL('/app', request.url).toString();
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }
  }
  
  // Get global Durable Object stub (all operations use same instance)
  const stub = getGuardStub(env);

  // Pass through query parameters (limit, type, since) from original request
  const requestUrl = new URL(request.url);
  const eventsUrl = new URL('/events', request.url);
  // Copy query parameters from original request
  requestUrl.searchParams.forEach((value, key) => {
    eventsUrl.searchParams.set(key, value);
  });
  
  // Always add siteId to filter events
  eventsUrl.searchParams.set('siteId', site.siteId);

  const eventsResponse = await stub.fetch(eventsUrl.toString());

  if (!eventsResponse.ok) {
    return new Response('Failed to get events', { status: 500 });
  }

  const data = await eventsResponse.json();
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `receipts-${timestamp}.json`;

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

async function handleExportEventsJSON(request: Request, env: Env): Promise<Response> {
  // Authenticate using SAT header or session cookie
  const { site, error: authError } = await authenticateReceiptsRequest(request, env);
  if (!site) {
    if (authError === 'unknown_site') {
      return new Response(JSON.stringify({ error: 'unknown_site' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Get events with filters
  const stub = getGuardStub(env);
  const url = new URL(request.url);
  const eventsUrl = new URL('/events', request.url);
  eventsUrl.searchParams.set('siteId', site.siteId);
  
  // Filters:
  // - limit (default 200, max 2000)
  // - since/until (ms epoch)
  // - action (optional, may be comma-separated)
  // - hostname (optional)
  // Default limit: 200, max: 2000
  const since = url.searchParams.get('since');
  const until = url.searchParams.get('until');
  const action = url.searchParams.get('action');
  const hostname = url.searchParams.get('hostname');
  const type = url.searchParams.get('type'); // backward-compat
  let limit = url.searchParams.get('limit');
  
  // Apply defaults and max
  if (!limit) {
    limit = '200'; // Default
  } else {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      limit = '200';
    } else if (limitNum > 2000) {
      limit = '2000'; // Max
    }
  }
  
  if (since) eventsUrl.searchParams.set('since', since);
  if (until) eventsUrl.searchParams.set('until', until);
  if (hostname) eventsUrl.searchParams.set('hostname', hostname);
  if (action) {
    eventsUrl.searchParams.set('action', action);
  } else if (type) {
    eventsUrl.searchParams.set('type', type);
  }
  eventsUrl.searchParams.set('limit', limit);
  
  const eventsResponse = await stub.fetch(eventsUrl.toString());
  if (!eventsResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to get events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const { events } = await eventsResponse.json<{ events: LinkEvent[] }>();
  
  return new Response(JSON.stringify({ events }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleSummaryJSON(request: Request, env: Env): Promise<Response> {
  // Authenticate using SAT header or session cookie
  const { site, error: authError } = await authenticateReceiptsRequest(request, env);
  if (!site) {
    if (authError === 'unknown_site') {
      return new Response(JSON.stringify({ error: 'unknown_site' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Get events for last 7d, then compute 1h/24h/7d windows from that set.
  const stub = getGuardStub(env);
  const now = Date.now();
  const since1h = now - (60 * 60 * 1000);
  const since24h = now - (24 * 60 * 60 * 1000);
  const since7d = now - (7 * 24 * 60 * 60 * 1000);
  
  const events7dUrl = new URL('/events', request.url);
  events7dUrl.searchParams.set('siteId', site.siteId);
  events7dUrl.searchParams.set('since', since7d.toString());
  events7dUrl.searchParams.set('limit', '10000');
  
  const events7dResponse = await stub.fetch(events7dUrl.toString());
  if (!events7dResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to get events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const { events } = await events7dResponse.json<{ events: LinkEvent[] }>();
  const latestEventTs = events.length > 0 ? events[0].timestamp : 0;
  
  const makeCounters = () => ({
    minted: 0,
    redeemed: 0,
    expired: 0,
    denied: 0,
    replay: 0,
  });
  
  const h1 = makeCounters();
  const h24 = makeCounters();
  const d7 = makeCounters();
  
  for (const ev of events) {
    // d7 includes all returned events (already filtered by since7d)
    if (ev.action in d7) (d7 as any)[ev.action] += 1;
    
    if (ev.timestamp >= since24h) {
      if (ev.action in h24) (h24 as any)[ev.action] += 1;
    }
    if (ev.timestamp >= since1h) {
      if (ev.action in h1) (h1 as any)[ev.action] += 1;
    }
  }
  
  return new Response(JSON.stringify({
    window: {
      h1,
      h24,
      d7,
    },
    latest_event_ts: latestEventTs,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handlePolicyJSON(request: Request, env: Env): Promise<Response> {
  // Authenticate using SAT header or session cookie
  const { site, error: authError } = await authenticateReceiptsRequest(request, env);
  if (!site) {
    if (authError === 'unknown_site') {
      return new Response(JSON.stringify({ error: 'unknown_site' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const policy = {
    hostname: site.hostname,
    originBaseUrl: site.originBaseUrl,
    pathAllowlist: site.pathAllowlist,
    queryAllowlist: site.queryAllowlist,
    turnstileEnabled: !!site.turnstileEnabled,
  };

  return new Response(JSON.stringify(policy), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleDebugSig(request: Request, env: Env): Promise<Response> {
  // Guard: only allow in local dev
  const host = request.headers.get('Host') || '';
  const isLocalDev = host.includes('127.0.0.1') || host.includes('localhost');
  
  if (!isLocalDev) {
    return new Response('Not Found', { status: 404 });
  }

  const url = new URL(request.url);
  const nonce = url.searchParams.get('nonce');
  
  if (!nonce) {
    return new Response(JSON.stringify({ error: 'Missing nonce parameter' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get session cookie
  const continuityId = getContinuityId(request);
  if (!continuityId) {
    return new Response(JSON.stringify({ error: 'Missing continuity cookie' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get proofSeed from DO
  const stub = getGuardStub(env);
  const proofSeedUrl = new URL('/get-proofseed', request.url);
  proofSeedUrl.searchParams.set('nonce', nonce);
  const proofSeedResponse = await stub.fetch(proofSeedUrl.toString());

  if (!proofSeedResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to get proofSeed' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { proofSeed } = await proofSeedResponse.json<{ proofSeed: string | null }>();
  
  if (!proofSeed) {
    return new Response(JSON.stringify({ error: 'ProofSeed not found for this nonce' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Compute expected signature
  const expected = await generateSignature(continuityId, nonce, proofSeed);

  return new Response(JSON.stringify({
    sessionId: continuityId,
    nonce,
    proofSeed,
    expected,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleDemoConsume(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'missing_token' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Escape token for HTML display
  const escapedToken = token.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo Origin - Token Consumed</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #667eea;
      margin-bottom: 20px;
    }
    .token {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 6px;
      font-family: monospace;
      word-break: break-all;
      margin: 20px 0;
    }
    .note {
      color: #666;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <h1>Demo origin reached</h1>
  <p>Token consumed: <span class="token">${escapedToken}</span></p>
  <p class="note">This simulates a real auth provider redeeming a one-time token</p>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

async function handleAdminSites(request: Request, env: Env): Promise<Response> {
  // Auth is already validated at top-level fetch handler
  const url = new URL(request.url);
  const path = url.pathname;
  const stub = getSitesStub(env);

  // POST /admin/sites - Create site
  if (path === '/admin/sites' && request.method === 'POST') {
    const body = await request.text();
    const createUrl = new URL('/create', request.url);
    const response = await stub.fetch(createUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });
    return response;
  }

  // GET /admin/sites/by-hostname/:hostname - Get site by hostname
  if (path.startsWith('/admin/sites/by-hostname/')) {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const hostPart = path.substring('/admin/sites/by-hostname/'.length);
    const hostname = decodeURIComponent(hostPart);
    const getByHostUrl = new URL('/get-by-hostname', request.url);
    getByHostUrl.searchParams.set('hostname', hostname);
    const siteRes = await stub.fetch(getByHostUrl.toString());
    if (siteRes.status === 404) {
      return new Response(JSON.stringify({ error: 'unknown_site' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return siteRes;
  }

  // GET /admin/sites - List all sites
  if (path === '/admin/sites' && request.method === 'GET') {
    const listUrl = new URL('/list', request.url);
    const response = await stub.fetch(listUrl.toString());
    return response;
  }

  // GET /admin/sites/:siteId or /admin/sites/:hostname
  const siteIdMatch = path.match(/^\/admin\/sites\/([^\/]+)$/);
  if (siteIdMatch) {
    const idOrHost = siteIdMatch[1];
    const looksLikeSiteId = /^[0-9a-f]{32}$/i.test(idOrHost);

    if (request.method === 'GET') {
      if (looksLikeSiteId) {
        const getUrl = new URL('/get', request.url);
        getUrl.searchParams.set('siteId', idOrHost);
        return await stub.fetch(getUrl.toString());
      }

      const getByHostUrl = new URL('/get-by-hostname', request.url);
      getByHostUrl.searchParams.set('hostname', normalizeHostHeader(idOrHost));
      return await stub.fetch(getByHostUrl.toString());
    }

    // PUT or PATCH /admin/sites/:siteId - Update site
    if (request.method === 'PUT' || request.method === 'PATCH') {
      const updateUrl = new URL('/update', request.url);
      updateUrl.searchParams.set('siteId', idOrHost);
      const body = await request.text();
      const response = await stub.fetch(updateUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });
      return response;
    }
  }

  // POST /admin/sites/:siteId/rotate-sat - Rotate SAT (returns new SAT once)
  const rotateSatMatch = path.match(/^\/admin\/sites\/([^\/]+)\/rotate-sat$/);
  if (rotateSatMatch && request.method === 'POST') {
    const siteId = rotateSatMatch[1];
    const rotateUrl = new URL('/rotate-sat', request.url);
    rotateUrl.searchParams.set('siteId', siteId);
    const response = await stub.fetch(rotateUrl.toString(), {
      method: 'POST',
    });
    return response;
  }

  return new Response('Not Found', { status: 404 });
}

async function handleDashboard(request: Request, env: Env): Promise<Response> {
  // Return static HTML dashboard that uses localStorage and client-side fetch
  const html = generateDashboardHTML();
  const response = new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
  return addSecurityHeaders(response);
}

async function handleDashboardLogin(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const sat = formData.get('sat') as string | null;
  
  const url = new URL(request.url);
  const hostname = url.host;
  const isLocalDev = isLocalDevHost(hostname);
  const isHttps = url.protocol === 'https:';
  
  if (!sat) {
    const html = generateDashboardLoginHTML(hostname, 'Missing Site Access Token', isLocalDev, isHttps);
    return new Response(html, {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }
  
  // Verify SAT
  const { site, error } = await verifySat(request, env, sat);
  if (!site) {
    const html = generateDashboardLoginHTML(hostname, 'Invalid Site Access Token', isLocalDev, isHttps);
    const response = new Response(html, {
      status: 401,
      headers: { 'Content-Type': 'text/html' },
    });
    return addSecurityHeaders(response);
  }
  
  // Set session cookie (siteId:hostname)
  // Expires in 7 days (604800 seconds)
  const sessionValue = `${site.siteId}:${site.hostname}`;
  const sessionCookie = buildSecureCookie('site_session', sessionValue, 604800, request);
  
  // Redirect to /app
  const redirectUrl = new URL('/app', request.url).toString();
  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirectUrl,
      'Set-Cookie': sessionCookie,
    },
  });
}

async function handleDashboardLogout(request: Request, env: Env): Promise<Response> {
  // Clear session cookie by setting it to expire immediately
  const clearCookie = buildClearCookie('site_session', request);
  
  // Redirect to /app (which will show login)
  const redirectUrl = new URL('/app', request.url).toString();
  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirectUrl,
      'Set-Cookie': clearCookie,
    },
  });
}

async function handleDashboardCounters(request: Request, env: Env): Promise<Response> {
  // Check for site session
  const session = getSiteSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Verify session
  const { site, error } = await getSiteConfig(request, env);
  if (!site || site.siteId !== session.siteId || site.hostname !== session.hostname) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Get events from last 24 hours
  const stub = getGuardStub(env);
  const since = Date.now() - (24 * 60 * 60 * 1000);
  const eventsUrl = new URL('/events', request.url);
  eventsUrl.searchParams.set('since', since.toString());
  eventsUrl.searchParams.set('limit', '10000'); // Get all events in last 24h
  
  const eventsResponse = await stub.fetch(eventsUrl.toString());
  if (!eventsResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to get events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const { events } = await eventsResponse.json<{ events: LinkEvent[] }>();
  
  // Filter events for this site
  const siteEvents = events.filter(e => e.siteId === site.siteId);
  
  // Calculate counters
  const counters = {
    minted: 0,
    redeemed: 0,
    replay: 0,
    expired: 0,
    likely_scanner: 0,
  };
  
  siteEvents.forEach(event => {
    if (event.action === 'minted') counters.minted++;
    if (event.action === 'redeemed') counters.redeemed++;
    if (event.action === 'replay') counters.replay++;
    if (event.action === 'expired') counters.expired++;
    if (event.note && event.note.includes('likely_scanner')) counters.likely_scanner++;
  });
  
  return new Response(JSON.stringify(counters), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateDashboardLoginHTML(hostname: string, error?: string, isLocalDev?: boolean, isHttps?: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Dashboard - Login</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 40px;
      max-width: 400px;
      width: 100%;
    }
    h1 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 24px;
    }
    .subtitle {
      color: #666;
      margin: 0 0 30px 0;
      font-size: 14px;
    }
    .error {
      background: #fee;
      color: #c33;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: monospace;
      margin-bottom: 20px;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      background: #667eea;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #5568d3;
    }
    .hint {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Site Dashboard</h1>
    <p class="subtitle">Enter your Site Access Token to continue</p>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="POST" action="/app/login">
      <label for="sat">Site Access Token</label>
      <input type="text" id="sat" name="sat" placeholder="Enter your SAT" required autofocus>
      <button type="submit">Login</button>
    </form>
    ${isLocalDev ? `<div style="margin-top: 20px; padding: 10px; background: #e3f2fd; border-radius: 4px; font-size: 12px; color: #1976d2; font-family: monospace;">Host: ${hostname} | HTTPS: ${isHttps ? 'true' : 'false'}</div>` : ''}
    <div class="hint">
      Your Site Access Token (SAT) was provided when this site was created via the Admin API. 
      Contact your administrator if you need a new token.
    </div>
  </div>
</body>
</html>`;
}

function generateDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      margin: 0;
      font-size: 24px;
    }
    .actions {
      display: flex;
      gap: 10px;
    }
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover:not(:disabled) {
      background: #5568d3;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #6c757d;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #5a6268;
    }
    .section {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    .section h2 {
      margin: 0 0 20px 0;
      font-size: 18px;
      color: #333;
    }
    .sat-input-section {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .sat-input-section h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #856404;
    }
    .sat-input-group {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    input[type="text"] {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: monospace;
    }
    .sat-display {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
    }
    .sat-display code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
    .status {
      font-size: 12px;
      color: #666;
      margin-top: 10px;
      font-style: italic;
    }
    .error {
      color: #dc3545;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
    }
    .counters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .counter {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .counter-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }
    .counter-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      font-weight: 600;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .type {
      font-weight: 600;
      font-size: 12px;
    }
    .type.minted { color: #28a745; }
    .type.redeemed { color: #007bff; }
    .type.expired { color: #dc3545; }
    .type.replay { color: #ff9800; }
    .type.denied { color: #9c27b0; }
    .ua {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      color: #666;
    }
    .note {
      font-size: 12px;
      color: #999;
      font-style: italic;
    }
    .loading {
      color: #999;
      font-style: italic;
    }
    .policy-item {
      margin: 10px 0;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .policy-label {
      font-weight: 600;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .policy-value {
      font-size: 14px;
      color: #333;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>Site Dashboard</h1>
      </div>
      <div class="actions">
        <button id="refreshBtn" class="btn-secondary">Refresh</button>
        <button id="clearSatBtn" class="btn-secondary">Clear SAT</button>
      </div>
    </header>

    <div class="section">
      <div class="sat-input-section">
        <h3>Site Access Token (SAT)</h3>
        <div class="sat-input-group">
          <input type="text" id="satInput" placeholder="Paste your Site Access Token here" />
          <button id="saveSatBtn">Save</button>
        </div>
        <div id="satDisplay" class="sat-display" style="display: none;">
          SAT saved: <code id="satDisplayValue"></code>
        </div>
      </div>
      <div id="errorMessage" class="error" style="display: none;"></div>
      <div id="statusMessage" class="status"></div>
    </div>

    <div class="section" id="policySection" style="display: none;">
      <h2>Policy</h2>
      <div id="policyContent"></div>
    </div>

    <div class="section" id="summarySection" style="display: none;">
      <h2>Summary</h2>
      <div id="summaryContent"></div>
    </div>

    <div class="section" id="eventsSection" style="display: none;">
      <h2>Latest Events</h2>
      <div id="eventsContent"></div>
    </div>
  </div>

  <script>
    (function() {
      const SAT_KEY = 'sat';
      
      function getSat() {
        return localStorage.getItem(SAT_KEY);
      }
      
      function setSat(sat) {
        if (sat) {
          localStorage.setItem(SAT_KEY, sat);
        } else {
          localStorage.removeItem(SAT_KEY);
        }
      }
      
      function maskSat(sat) {
        if (!sat || sat.length < 10) return sat;
        return sat.substring(0, 6) + '...' + sat.substring(sat.length - 4);
      }
      
      function showError(msg) {
        const el = document.getElementById('errorMessage');
        if (el) {
          el.textContent = msg;
          el.style.display = 'block';
        }
      }
      
      function hideError() {
        const el = document.getElementById('errorMessage');
        if (el) {
          el.style.display = 'none';
        }
      }
      
      function showStatus(msg) {
        const el = document.getElementById('statusMessage');
        if (el) {
          el.textContent = msg;
        }
      }
      
      function formatTimestamp(ts) {
        if (!ts) return '-';
        const d = new Date(ts);
        return d.toLocaleString() + ' (' + d.toISOString() + ')';
      }
      
      async function fetchWithAuth(url) {
        const sat = getSat();
        if (!sat) {
          throw new Error('No SAT set');
        }
        
        const res = await fetch(url, {
          headers: {
            'Authorization': 'Bearer ' + sat
          }
        });
        
        if (res.status === 401) {
          throw new Error('Unauthorized: check SAT');
        }
        
        if (res.status === 404) {
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            if (json.error === 'unknown_site') {
              throw new Error('Unknown site for this SAT.');
            }
          } catch (e) {}
          throw new Error('Not found');
        }
        
        if (!res.ok) {
          throw new Error('Request failed: ' + res.status);
        }
        
        return res.json();
      }
      
      async function loadData() {
        const sat = getSat();
        if (!sat) {
          hideError();
          showStatus('Enter a Site Access Token to view dashboard data.');
          document.getElementById('policySection').style.display = 'none';
          document.getElementById('summarySection').style.display = 'none';
          document.getElementById('eventsSection').style.display = 'none';
          return;
        }
        
        hideError();
        showStatus('Loading...');
        
        try {
          const [policy, summary, events] = await Promise.all([
            fetchWithAuth('/r/policy.json'),
            fetchWithAuth('/r/summary.json'),
            fetchWithAuth('/r/export.json?limit=50')
          ]);
          
          // Render policy
          const policyContent = document.getElementById('policyContent');
          if (policyContent) {
            policyContent.innerHTML = 
              '<div class="policy-item"><div class="policy-label">Hostname</div><div class="policy-value">' + 
              (policy.hostname || '-') + '</div></div>' +
              '<div class="policy-item"><div class="policy-label">Origin Base URL</div><div class="policy-value">' + 
              (policy.originBaseUrl || '-') + '</div></div>' +
              '<div class="policy-item"><div class="policy-label">Path Allowlist</div><div class="policy-value">' + 
              (policy.pathAllowlist ? policy.pathAllowlist.join(', ') : '-') + '</div></div>' +
              '<div class="policy-item"><div class="policy-label">Query Allowlist</div><div class="policy-value">' + 
              (policy.queryAllowlist ? policy.queryAllowlist.join(', ') : '-') + '</div></div>' +
              '<div class="policy-item"><div class="policy-label">Turnstile Enabled</div><div class="policy-value">' + 
              (policy.turnstileEnabled ? 'Yes' : 'No') + '</div></div>';
            document.getElementById('policySection').style.display = 'block';
          }
          
          // Render summary
          const summaryContent = document.getElementById('summaryContent');
          if (summaryContent && summary.window) {
            const h1 = summary.window.h1 || {};
            const h24 = summary.window.h24 || {};
            const d7 = summary.window.d7 || {};
            
            summaryContent.innerHTML = 
              '<div class="counters">' +
              '<div class="counter"><div class="counter-value">' + (h1.minted || 0) + '</div><div class="counter-label">Minted (1h)</div></div>' +
              '<div class="counter"><div class="counter-value">' + (h1.redeemed || 0) + '</div><div class="counter-label">Redeemed (1h)</div></div>' +
              '<div class="counter"><div class="counter-value">' + (h24.minted || 0) + '</div><div class="counter-label">Minted (24h)</div></div>' +
              '<div class="counter"><div class="counter-value">' + (h24.redeemed || 0) + '</div><div class="counter-label">Redeemed (24h)</div></div>' +
              '<div class="counter"><div class="counter-value">' + (h24.replay || 0) + '</div><div class="counter-label">Replay (24h)</div></div>' +
              '<div class="counter"><div class="counter-value">' + (h24.expired || 0) + '</div><div class="counter-label">Expired (24h)</div></div>' +
              '<div class="counter"><div class="counter-value">' + (h24.likely_scanner || 0) + '</div><div class="counter-label">Likely Scanner (24h)</div></div>' +
              '<div class="counter"><div class="counter-value">' + (d7.minted || 0) + '</div><div class="counter-label">Minted (7d)</div></div>' +
              '<div class="counter"><div class="counter-value">' + (d7.redeemed || 0) + '</div><div class="counter-label">Redeemed (7d)</div></div>' +
              '</div>' +
              '<div style="margin-top: 15px; font-size: 12px; color: #666;">' +
              'Latest event: ' + (summary.latest_event_ts ? formatTimestamp(summary.latest_event_ts) : '-') +
              '</div>';
            document.getElementById('summarySection').style.display = 'block';
          }
          
          // Render events
          const eventsContent = document.getElementById('eventsContent');
          if (eventsContent && events.events) {
            const eventsList = events.events || [];
            if (eventsList.length === 0) {
              eventsContent.innerHTML = '<p class="loading">No events found</p>';
            } else {
              eventsContent.innerHTML = 
                '<table><thead><tr><th>Timestamp</th><th>Action</th><th>Note</th><th>Origin URL</th><th>UA</th><th>IP</th></tr></thead><tbody>' +
                eventsList.map(function(e) {
                  return '<tr>' +
                    '<td>' + formatTimestamp(e.timestamp) + '</td>' +
                    '<td><span class="type ' + (e.action || '') + '">' + (e.action || '-') + '</span></td>' +
                    '<td><span class="note">' + (e.note || '-') + '</span></td>' +
                    '<td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + (e.originUrl || '-') + '</td>' +
                    '<td><span class="ua" title="' + ((e.ua || '').replace(/"/g, '&quot;')) + '">' + 
                    ((e.ua || '').substring(0, 50) + ((e.ua && e.ua.length > 50) ? '...' : '')) + '</span></td>' +
                    '<td>' + (e.ip || '-') + '</td>' +
                    '</tr>';
                }).join('') +
                '</tbody></table>';
            }
            document.getElementById('eventsSection').style.display = 'block';
          }
          
          showStatus('Loaded policy/summary/events at ' + new Date().toLocaleTimeString());
        } catch (err) {
          showError(err.message || 'Failed to load data');
          showStatus('');
          document.getElementById('policySection').style.display = 'none';
          document.getElementById('summarySection').style.display = 'none';
          document.getElementById('eventsSection').style.display = 'none';
        }
      }
      
      // Initialize
      const savedSat = getSat();
      if (savedSat) {
        document.getElementById('satInput').value = savedSat;
        const displayEl = document.getElementById('satDisplay');
        const displayValueEl = document.getElementById('satDisplayValue');
        if (displayEl && displayValueEl) {
          displayValueEl.textContent = maskSat(savedSat);
          displayEl.style.display = 'block';
        }
        loadData();
      }
      
      // Event handlers
      document.getElementById('saveSatBtn').addEventListener('click', function() {
        const sat = document.getElementById('satInput').value.trim();
        if (!sat) {
          showError('Please enter a SAT');
          return;
        }
        setSat(sat);
        const displayEl = document.getElementById('satDisplay');
        const displayValueEl = document.getElementById('satDisplayValue');
        if (displayEl && displayValueEl) {
          displayValueEl.textContent = maskSat(sat);
          displayEl.style.display = 'block';
        }
        hideError();
        loadData();
      });
      
      document.getElementById('clearSatBtn').addEventListener('click', function() {
        setSat(null);
        document.getElementById('satInput').value = '';
        document.getElementById('satDisplay').style.display = 'none';
        hideError();
        showStatus('SAT cleared. Enter a new SAT to view dashboard data.');
        document.getElementById('policySection').style.display = 'none';
        document.getElementById('summarySection').style.display = 'none';
        document.getElementById('eventsSection').style.display = 'none';
      });
      
      document.getElementById('refreshBtn').addEventListener('click', function() {
        loadData();
      });
    })();
  </script>
</body>
</html>`;
}

function getClientIP(request: Request): string | undefined {
  // Try CF-Connecting-IP first (Cloudflare)
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp;
  
  // Try X-Forwarded-For
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) {
    // Take the first IP (client IP)
    return xff.split(',')[0].trim();
  }
  
  // Try X-Real-IP
  const xri = request.headers.get('X-Real-IP');
  if (xri) return xri;
  
  return undefined;
}

function detectScannerUA(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  
  const uaLower = userAgent.toLowerCase();
  
  // Common scanner keywords
  const scannerKeywords = [
    'proofpoint',
    'mimecast',
    'defender',
    'barracuda',
    'symantec',
    'trend micro',
    'forcepoint',
    'fireeye',
    'checkpoint',
    'palo alto',
    'zscaler',
    'cisco',
    'fortinet',
    'mcafee',
    'sophos',
    'kaspersky',
    'avast',
    'avg',
    'eset',
    'f-secure',
    'urlscan',
    'virustotal',
    'sucuri',
    'cloudflare scanner',
    'google safe browsing',
    'phishtank',
    'urlvoid',
    'sitelock',
  ];
  
  return scannerKeywords.some(keyword => uaLower.includes(keyword));
}

function getOrCreateContinuityId(request: Request): string {
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/continuity=([^;]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Generate a new continuity ID (deterministic based on request)
  // In a real implementation, you might want to use crypto.randomUUID()
  // For now, we'll use a simple hash of the request
  return `cont_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getContinuityId(request: Request): string | null {
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/continuity=([^;]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Generate a random hexadecimal string (lowercase, no dashes)
 * @param bytes Number of random bytes to generate
 * @returns Hexadecimal string of length bytes * 2
 */
function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateSignature(sessionId: string, nonce: string, proofSeed: string): Promise<string> {
  // Generate signature: sha256hex(sessionId + ":" + nonce + ":" + proofSeed)
  // Returns full 64-character hex string (32 bytes)
  const data = `${sessionId}:${nonce}:${proofSeed}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const bytes = new Uint8Array(hashBuffer);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return full 64-character hex string
  return hex;
}

function generateInterstitialHTML(nonce: string, originUrl: string, sessionId: string, proofSeed: string, turnstileSiteKey?: string): string {
  // Extract origin base URL for signature computation
  const urlObj = new URL(originUrl);
  const originBase = `${urlObj.protocol}//${urlObj.host}`;
  
  // Escape values for JavaScript
  const escapedNonce = nonce.replace(/'/g, "\\'");
  const escapedSessionId = sessionId.replace(/'/g, "\\'");
  const escapedProofSeed = proofSeed.replace(/'/g, "\\'");
  const escapedSiteKey = turnstileSiteKey ? turnstileSiteKey.replace(/'/g, "\\'") : '';
  // Escape originUrl for JavaScript (targetUrl constant)
  const escapedTargetUrl = originUrl
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  
  // Escape originUrl for HTML display (in noscript block)
  const escapedOriginUrl = originUrl
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  const showTurnstile = !!turnstileSiteKey;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifying Link...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 400px;
    }
    h1 {
      margin-top: 0;
      color: #667eea;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .message {
      margin: 1rem 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }
    form {
      margin-top: 1rem;
    }
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.3s;
    }
    button:hover:not(:disabled) {
      background: #5568d3;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }
    .noscript-fallback {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
      color: #856404;
    }
    .noscript-fallback strong {
      display: block;
      margin-bottom: 0.5rem;
      color: #856404;
    }
    .noscript-fallback p {
      margin: 0.5rem 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .browser-instructions {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
      font-size: 13px;
      color: #666;
    }
    .browser-instructions strong {
      display: block;
      margin-bottom: 0.5rem;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Verifying Link</h1>
    <div class="spinner"></div>
    <p>Please wait while we verify this link...</p>
    <div class="message">
      Security scanners may preview this link. This step ensures only you complete it.
    </div>
    <noscript>
      <div class="noscript-fallback">
        <strong>JavaScript is required</strong>
        <p>This link requires a browser with JavaScript enabled. Copy and paste this link into Chrome, Safari, Firefox, or Edge to continue.</p>
        <p style="margin-top: 0.75rem; font-family: monospace; font-size: 12px; word-break: break-all; background: #fff; padding: 0.5rem; border-radius: 4px;">${escapedOriginUrl}</p>
      </div>
    </noscript>
    <div class="browser-instructions">
      <strong>Opening in an email client?</strong>
      <p>If you're viewing this in an email app (Gmail, Outlook, Apple Mail), tap "Open in browser" or copy the link and paste it into Chrome, Safari, or Firefox.</p>
    </div>
    ${showTurnstile ? `<div id="turnstile-widget" style="margin: 1rem 0; display: flex; justify-content: center;"></div>` : ''}
    <form id="verifyForm" method="POST" action="/v/${nonce}" style="margin-top: 1rem;" data-nonce="${nonce}" data-seed="${proofSeed}">
      <button type="submit" id="continueBtn" disabled>Continue</button>
      <div id="errorMessage" style="margin-top:0.75rem;color:#b00020;font-size:13px;display:none;"></div>
    </form>
  </div>
  ${showTurnstile ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : ''}
  <script>
    (async function() {
      const nonce = '${escapedNonce}';
      const sessionId = '${escapedSessionId}';
      const proofSeed = '${escapedProofSeed}';
      const originUrl = '${escapedTargetUrl}';
      const showTurnstile = ${showTurnstile};
      const turnstileSiteKey = ${showTurnstile ? `'${escapedSiteKey}'` : 'null'};
      
      let signature = '';
      let signatureComputed = false;
      let turnstileCompleted = !showTurnstile;
      let submitting = false;
      let turnstileToken = '';
      
      function enableButtonIfReady() {
        var btn = document.getElementById('continueBtn');
        if (!btn) return;
        if (signatureComputed && turnstileCompleted && !submitting) {
          btn.disabled = false;
        }
      }
      
      // Compute signature in browser: sha256hex(sessionId + ":" + nonce + ":" + proofSeed)
      // Returns full 64-character hex string (32 bytes)
      async function computeSignature(sessionId, nonce, proofSeed) {
        const data = sessionId + ':' + nonce + ':' + proofSeed;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const bytes = new Uint8Array(hashBuffer);
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        // Return full 64-character hex string
        return hex;
      }

      var errorEl = document.getElementById('errorMessage');
      function showError(msg) {
        if (!errorEl) return;
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      }
      
      // Initialize Turnstile if enabled
      if (showTurnstile && turnstileSiteKey) {
        window.turnstileCallback = function(token) {
          turnstileToken = token || '';
          turnstileCompleted = true;
          enableButtonIfReady();
        };
        
        window.turnstileError = function() {
          console.error('Turnstile error');
          var btn = document.getElementById('continueBtn');
          if (btn) {
            btn.textContent = 'Verification failed - Please refresh';
          }
          showError('Verification failed. Please refresh and try again.');
        };
        
        // Wait for Turnstile script to load
        function initTurnstile() {
          if (window.turnstile) {
            window.turnstile.render(document.getElementById('turnstile-widget'), {
              sitekey: turnstileSiteKey,
              callback: window.turnstileCallback,
              'error-callback': window.turnstileError,
            });
          } else {
            setTimeout(initTurnstile, 100);
          }
        }
        initTurnstile();
      }
      
      try {
        // Compute signature: sha256hex(sessionId + ":" + nonce + ":" + proofSeed)
        signature = await computeSignature(sessionId, nonce, proofSeed);
        signatureComputed = true;
        enableButtonIfReady();
      } catch (error) {
        console.error('Failed to compute signature:', error);
        var btn = document.getElementById('continueBtn');
        if (btn) {
          btn.textContent = 'Error - Please refresh';
        }
        showError('Failed to prepare secure redirect. Please refresh this page.');
      }

      var form = document.getElementById('verifyForm');
      var button = document.getElementById('continueBtn');
      if (form && button) {
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          if (submitting) {
            return;
          }
          if (!signatureComputed || !turnstileCompleted) {
            showError('Still preparing your link. Please wait a moment and try again.');
            return;
          }
          submitting = true;
          button.disabled = true;
          button.textContent = 'Redirecting…';
          if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
          }

          var params = new URLSearchParams();
          params.set('signature', signature);
          params.set('proofSeed', proofSeed);
          if (showTurnstile && turnstileSiteKey && turnstileToken) {
            params.set('turnstile-token', turnstileToken);
          }

          var shouldReenable = true;
          try {
            var res = await fetch(form.action, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              credentials: 'include',
              redirect: 'manual',
              body: params.toString()
            });

            // Success: 302/303 redirect - read Location header and navigate
            if (res.status === 302 || res.status === 303) {
              var loc = res.headers.get('Location');
              if (loc) {
                window.location.assign(loc);
                return; // Don't re-enable button on successful redirect
              }
              // Fallback: if Location header missing, use pre-computed originUrl
              window.location.assign(originUrl);
              return;
            } else if (res.type === 'opaqueredirect' || res.ok) {
              // Opaque redirect or 200/204 - use pre-computed originUrl
              window.location.assign(originUrl);
              return;
            } else if (res.status === 409) {
              showError('This link was already used. Please request a new one.');
            } else if (res.status === 403) {
              var text = '';
              try {
                text = await res.text();
              } catch (e) {}
              var isMissingCookie = false;
              if (text) {
                try {
                  var json = JSON.parse(text);
                  if (json && json.reason === 'missing_session_cookie') {
                    isMissingCookie = true;
                  }
                } catch (e) {}
              }
              if (isMissingCookie) {
                showError('Please open this link in a browser (not an email preview). Copy and paste the link into Chrome, Safari, or Firefox.');
              } else {
                showError('Access denied. Please refresh and try again.');
              }
            } else {
              showError('Unexpected response. Please refresh and try again.');
            }
          } catch (e) {
            showError('Network error. Please check your connection and try again.');
          } finally {
            submitting = false;
            if (shouldReenable) {
              button.disabled = false;
              button.textContent = 'Continue';
            }
          }
        });
      }
    })();
  </script>
</body>
</html>`;
}

function generateReceiptsHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Events - Receipts</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 20px;
    }
    h1 {
      margin: 0 0 20px 0;
      color: #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #5568d3;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      background: #f0f0f0;
      color: #666;
    }
    .status.error {
      background: #fee;
      color: #c33;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #ddd;
      font-weight: 600;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    tr:hover {
      background: #f9f9f9;
    }
    .type {
      font-weight: 600;
    }
    .type.minted {
      color: #28a745;
    }
    .type.redeemed {
      color: #007bff;
    }
    .type.expired {
      color: #dc3545;
    }
    .type.replay {
      color: #ff9800;
    }
    .type.denied {
      color: #9c27b0;
    }
    .nonce {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #666;
    }
    .hostname {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
    .filters {
      display: flex;
      gap: 15px;
      align-items: center;
      margin-bottom: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 6px;
    }
    .filters label {
      font-size: 14px;
      font-weight: 500;
      color: #666;
    }
    .filters select {
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }
    .filters select:hover {
      border-color: #667eea;
    }
    .ua {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      color: #666;
    }
    .note {
      font-size: 12px;
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>
      <span>Link Events</span>
      <button id="refreshBtn" onclick="loadEvents()">Refresh</button>
    </h1>
    <div class="filters">
      <label>
        Type:
        <select id="typeFilter" onchange="loadEvents()">
          <option value="">All</option>
          <option value="minted">Minted</option>
          <option value="redeemed">Redeemed</option>
          <option value="replay">Replay</option>
          <option value="expired">Expired</option>
          <option value="denied">Denied</option>
        </select>
      </label>
      <label>
        Limit:
        <select id="limitFilter" onchange="loadEvents()">
          <option value="50">50</option>
          <option value="200" selected>200</option>
          <option value="500">500</option>
        </select>
      </label>
    </div>
    <div id="status"></div>
    <table id="eventsTable" style="display: none;">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Type</th>
          <th>Nonce</th>
          <th>Site</th>
          <th>IP</th>
          <th>User Agent</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody id="eventsBody">
      </tbody>
    </table>
  </div>
  <script>
    function formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
    }
    
    function truncateUA(ua, maxLength = 50) {
      if (!ua) return '-';
      return ua.length > maxLength ? ua.substring(0, maxLength) + '...' : ua;
    }
    
    function renderEvents(events) {
      const tbody = document.getElementById('eventsBody');
      const table = document.getElementById('eventsTable');
      
      tbody.innerHTML = '';
      
      if (events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999; padding: 40px;">No events found</td></tr>';
        table.style.display = 'table';
        return;
      }
      
      events.forEach(event => {
        const row = document.createElement('tr');
        const siteInfo = event.hostname ? \`<span class="hostname" title="Site ID: \${event.siteId || 'N/A'}">\${event.hostname}</span>\` : '-';
        row.innerHTML = \`
          <td>\${formatTimestamp(event.timestamp)}</td>
          <td><span class="type \${event.action}">\${event.action}</span></td>
          <td><span class="nonce">\${event.nonce}</span></td>
          <td>\${siteInfo}</td>
          <td>\${event.ip || '-'}</td>
          <td><span class="ua" title="\${event.ua || ''}">\${truncateUA(event.ua)}</span></td>
          <td><span class="note">\${event.note || '-'}</span></td>
        \`;
        tbody.appendChild(row);
      });
      
      table.style.display = 'table';
    }
    
    function showStatus(message, isError = false) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = 'status' + (isError ? ' error' : '');
      status.style.display = 'block';
    }
    
    function hideStatus() {
      document.getElementById('status').style.display = 'none';
    }
    
    async function loadEvents() {
      const btn = document.getElementById('refreshBtn');
      btn.disabled = true;
      btn.textContent = 'Loading...';
      hideStatus();
      
      try {
        const typeFilter = document.getElementById('typeFilter').value;
        const limitFilter = document.getElementById('limitFilter').value;
        
        let url = '/r/events?limit=' + limitFilter;
        if (typeFilter) {
          url += '&type=' + typeFilter;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to load events');
        }
        const data = await response.json();
        renderEvents(data.events || []);
        showStatus(\`Loaded \${data.events?.length || 0} events\`);
        setTimeout(hideStatus, 2000);
      } catch (error) {
        showStatus('Error loading events: ' + error.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Refresh';
      }
    }
    
    // Load events on page load
    loadEvents();
  </script>
</body>
</html>`;
}
