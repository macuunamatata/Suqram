// Auth Link Scanner Immunity Rail: GET /r/:rid (safe), POST /redeem (only spend path)

import { RedemptionPermitDO } from './redemption-permit-do';
import { generateRailBootloaderHTML } from './html';
import { validateDestinationUrl } from './validate';
import { insertTelemetry, insertRedemptionLedger, type DstMeta } from './db';

const RAIL_NONCE_TTL_MS = 5 * 60 * 1000;

export interface RailEnv {
  REDEMPTION_PERMIT: DurableObjectNamespace;
  EIG_DB: D1Database;
  /** Comma-separated exact hosts, e.g. "example.com,myapp.vercel.app" */
  ALLOWED_DEST_HOSTS?: string;
  /** Comma-separated host suffixes, e.g. ".supabase.co,.vercel.app" */
  ALLOWED_DEST_HOST_SUFFIXES?: string;
  /** Set to "1" or "true" to allow private IPs (e.g. dev) */
  ALLOWED_PRIVATE_IP?: string;
}

async function generateContinuityHash(request: Request): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || 'unknown';
  const data = `${ip}:${ua}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

function getContinuityId(request: Request): string | null {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/rail_continuity=([^;]+)/);
  return match ? match[1] : null;
}

function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getOrCreateContinuityCookie(request: Request, continuityHash: string): string {
  const existing = getContinuityId(request);
  if (existing) return existing;
  return `${continuityHash}-${Date.now()}`;
}

/**
 * GET /r/:rid - ALWAYS safe. Returns bootloader HTML; sets continuity + CSRF cookies; issues nonce from DO. Never redeems.
 */
export async function handleGetRail(request: Request, env: RailEnv, rid: string): Promise<Response> {
  const continuityHash = await generateContinuityHash(request);
  const continuityId = getOrCreateContinuityCookie(request, continuityHash);
  const csrfToken = generateCSRFToken();

  const permitDOId = (env.REDEMPTION_PERMIT as DurableObjectNamespace).idFromName(`rid:${rid}`);
  const permitDO = (env.REDEMPTION_PERMIT as DurableObjectNamespace).get(permitDOId);
  const issueUrl = new URL('/issue', request.url);
  issueUrl.searchParams.set('rid', rid);
  issueUrl.searchParams.set('continuity_hash', continuityHash);
  issueUrl.searchParams.set('ttl_ms', String(RAIL_NONCE_TTL_MS));

  const issueResponse = await permitDO.fetch(issueUrl.toString());
  if (!issueResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to issue permit' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { nonce, exp } = await issueResponse.json<{ nonce: string; exp: number }>();
  const html = generateRailBootloaderHTML(nonce, csrfToken, rid);

  const url = new URL(request.url);
  const isSecure = url.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  const headers = new Headers({
    'Content-Type': 'text/html',
    'Set-Cookie': [
      `rail_continuity=${continuityId}; SameSite=Lax; Path=/; Max-Age=86400`,
      `rail_csrf=${csrfToken}; SameSite=Lax; Path=/; HttpOnly; Max-Age=3600${secureFlag}`,
    ].join(', '),
  });

  try {
    await insertTelemetry(env.EIG_DB, rid, 'entry_issued');
  } catch (_) {
    // non-blocking
  }
  const now = Date.now();
  try {
    await insertRedemptionLedger(env.EIG_DB, rid, now, null, 'issued');
  } catch (_) {}

  return new Response(html, { headers });
}

/**
 * POST /redeem - ONLY spend path. Validates continuity, CSRF, nonce (DO), u (destination). Returns { ok, redirect_to } or { ok: false, reason }.
 */
export async function handlePostRedeem(request: Request, env: RailEnv): Promise<Response> {
  const continuityId = getContinuityId(request);
  if (!continuityId) {
    return jsonResponse({ ok: false, reason: 'missing_continuity' });
  }

  const cookies = request.headers.get('Cookie') || '';
  const csrfCookieMatch = cookies.match(/rail_csrf=([^;]+)/);
  const csrfCookie = csrfCookieMatch ? csrfCookieMatch[1] : null;
  const csrfHeader = request.headers.get('X-CSRF');
  let body: { nonce?: string; rid?: string; u?: string; csrf?: string };
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await request.json<typeof body>();
  } else {
    const formData = await request.formData();
    body = {
      nonce: (formData.get('nonce') as string) ?? undefined,
      rid: (formData.get('rid') as string) ?? undefined,
      u: (formData.get('u') as string) ?? undefined,
      csrf: (formData.get('csrf') as string) ?? undefined,
    };
  }
  const csrfValue = body.csrf ?? csrfHeader;
  if (!csrfCookie || !csrfValue || csrfCookie !== csrfValue) {
    await telemetryDenied(env, body.rid ?? 'unknown', 'csrf_mismatch');
    return jsonResponse({ ok: false, reason: 'csrf_mismatch' });
  }

  const nonce = body.nonce;
  const rid = body.rid;
  const u = typeof body.u === 'string' ? body.u.trim() : '';
  if (!nonce || !rid) {
    await telemetryDenied(env, rid ?? 'unknown', 'BAD_BODY');
    return jsonResponse({ ok: false, reason: 'BAD_BODY' });
  }
  if (!u) {
    await telemetryDenied(env, rid, 'BAD_BODY');
    return jsonResponse({ ok: false, reason: 'BAD_BODY' });
  }

  const dst = decodeDestination(u);
  if (!dst) {
    await telemetryDenied(env, rid, 'BAD_BODY');
    return jsonResponse({ ok: false, reason: 'BAD_BODY' });
  }

  const validation = validateDestinationUrl(dst, {
    allowedHosts: env.ALLOWED_DEST_HOSTS,
    allowedHostSuffixes: env.ALLOWED_DEST_HOST_SUFFIXES,
    allowedPrivateIP: env.ALLOWED_PRIVATE_IP === '1' || env.ALLOWED_PRIVATE_IP === 'true',
  });
  if (!validation.valid) {
    await telemetryDenied(env, rid, 'invalid_destination');
    return jsonResponse({ ok: false, reason: 'invalid_destination' });
  }

  const continuityHash = await generateContinuityHash(request);
  const permitDOId = (env.REDEMPTION_PERMIT as DurableObjectNamespace).idFromName(`rid:${rid}`);
  const permitDO = (env.REDEMPTION_PERMIT as DurableObjectNamespace).get(permitDOId);
  const redeemUrl = new URL('/redeem', request.url);
  redeemUrl.searchParams.set('nonce', nonce);
  redeemUrl.searchParams.set('continuity_hash', continuityHash);
  redeemUrl.searchParams.set('rid', rid);

  const redeemResponse = await permitDO.fetch(redeemUrl.toString());
  const redeemData = await redeemResponse.json() as { ok: boolean; reason?: string };

  if (!redeemData.ok) {
    const reason = redeemData.reason ?? 'redeem_failed';
    await telemetryDenied(env, rid, reason);
    return jsonResponse({ ok: false, reason });
  }

  const dstMeta: DstMeta = {
    dst_host: new URL(dst).hostname,
    dst_path_len: new URL(dst).pathname.length,
    dst_hash: await sha256Hex(dst),
  };
  try {
    await insertTelemetry(env.EIG_DB, rid, 'redeemed', undefined, dstMeta);
  } catch (_) {}
  try {
    await insertRedemptionLedger(env.EIG_DB, rid, 0, Date.now(), 'redeemed', undefined, dstMeta);
  } catch (_) {}

  return jsonResponse({ ok: true, redirect_to: dst });
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(obj: Record<string, unknown>): Response {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function decodeDestination(u: string): string | null {
  try {
    if (u.startsWith('u=')) u = u.slice(2);
    const decoded = decodeURIComponent(u);
    new URL(decoded);
    return decoded;
  } catch {
    return null;
  }
}

async function telemetryDenied(env: RailEnv, rid: string, reason: string): Promise<void> {
  try {
    await insertTelemetry(env.EIG_DB, rid, 'redeem_denied', reason);
  } catch (_) {}
}
