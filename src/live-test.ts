/**
 * Live Inbox Test: send real email with protected + control links; control consumed server-side.
 * Demo (no email): POST /test/create, POST /test/simulate, GET /test/status
 * POST /test/send, GET /test/control, GET /test/status
 */

import { handleGetRail, type RailEnv } from './rail/routes';

const RESEND_API = 'https://api.resend.com/emails';
const MARKETING_BASE = 'https://suqram.com';
const RATE_LIMIT_PER_EMAIL = 3;
const RATE_LIMIT_PER_IP = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEMO_RATE_LIMIT_PER_IP = 20;
const SCANNER_UA = 'Microsoft Office/16.0 (Windows NT 10.0; Microsoft Safe Links Scanner)';

export interface LiveTestEnv {
  EIG_DB: D1Database;
  RESEND_API_KEY?: string;
  TEST_FROM_EMAIL?: string;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function insertLiveTestEvent(
  env: LiveTestEnv,
  id: string,
  tid: string,
  variant: string,
  kind: string,
  created_at: number,
  meta: string | null
): Promise<D1Result> {
  return env.EIG_DB.prepare(
    'INSERT INTO live_test_events (id, tid, variant, kind, created_at, meta) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, tid, variant, kind, created_at, meta ?? null).run();
}

/** POST /test/send — body: { email: string } */
export async function handleTestSend(request: Request, env: LiveTestEnv, railBase: string): Promise<Response> {
  if (!env.RESEND_API_KEY || !env.TEST_FROM_EMAIL) {
    return jsonResponse(500, { ok: false, error: 'Live test not configured' });
  }

  const cloned = request.clone();
  let raw: string;
  try {
    raw = await cloned.text();
  } catch (e) {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON', detail: String(e) });
  }
  let body: { email?: string };
  try {
    body = JSON.parse(raw) as { email?: string };
  } catch (e) {
    return jsonResponse(400, {
      ok: false,
      error: 'Invalid JSON',
      detail: String(e),
      rawLength: raw.length,
    });
  }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { ok: false, error: 'Valid email required' });
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const emailHash = await sha256Hex(email);
  const ipHash = await sha256Hex(ip);
  const now = Date.now();
  const since = now - RATE_WINDOW_MS;

  const recentByEmail = await env.EIG_DB.prepare(
    'SELECT 1 FROM live_tests WHERE email_hash = ? AND created_at > ? LIMIT ?'
  ).bind(emailHash, since, RATE_LIMIT_PER_EMAIL + 1).all();
  if (recentByEmail.results.length > RATE_LIMIT_PER_EMAIL) {
    return jsonResponse(429, { ok: false, error: 'Too many requests for this email' });
  }
  const recentByIp = await env.EIG_DB.prepare(
    'SELECT 1 FROM live_tests WHERE creator_ip_hash = ? AND created_at > ? LIMIT ?'
  ).bind(ipHash, since, RATE_LIMIT_PER_IP + 1).all();
  if (recentByIp.results.length > RATE_LIMIT_PER_IP) {
    return jsonResponse(429, { ok: false, error: 'Too many requests from this IP' });
  }

  const tid = crypto.randomUUID();
  const rid = crypto.randomUUID();
  const controlToken = randomToken();
  const controlTokenHash = await sha256Hex(controlToken);

  const protectedDest = `${MARKETING_BASE}/test/protected?tid=${tid}`;
  const protectedLink = `${railBase}/r/${rid}#u=${encodeURIComponent(protectedDest)}`;
  const controlLink = `${railBase}/test/control?tid=${tid}&token=${controlToken}`;

  const html = `
    <p>This is a live inbox test from Auth Link Rail.</p>
    <p><strong>Protected link</strong> (should always work when you click):<br/>
    <a href="${protectedLink}">${protectedLink}</a></p>
    <p><strong>Control link</strong> (unprotected; scanners may consume it):<br/>
    <a href="${controlLink}">${controlLink}</a></p>
    <p>Click the protected link first, then the control link — or try in a corporate inbox to see the control link often fail after scanners touch it.</p>
  `.replace(/\s+/g, ' ').trim();

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.TEST_FROM_EMAIL,
      to: [email],
      subject: 'Auth Link Rail — Live inbox test',
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return jsonResponse(502, { ok: false, error: 'Email send failed', detail: err.slice(0, 200) });
  }

  await env.EIG_DB.prepare(
    `INSERT INTO live_tests (tid, created_at, email_hash, creator_ip_hash, protected_rid, control_token_hash)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(tid, now, emailHash, ipHash, rid, controlTokenHash).run();
  await env.EIG_DB.prepare(
    'INSERT INTO control_tokens (tid, token_hash) VALUES (?, ?)'
  ).bind(tid, controlTokenHash).run();
  await insertLiveTestEvent(env, crypto.randomUUID(), tid, '', 'sent', now, null);

  return jsonResponse(200, { ok: true });
}

/** POST /test/create — create demo session (no email), return { tid, normalLink, protectedLink } */
export async function handleTestCreate(request: Request, env: LiveTestEnv, railBase: string): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(ip);
  const now = Date.now();
  const since = now - RATE_WINDOW_MS;
  const recentByIp = await env.EIG_DB.prepare(
    'SELECT 1 FROM live_tests WHERE creator_ip_hash = ? AND created_at > ? AND email_hash = ? LIMIT ?'
  ).bind(ipHash, since, 'demo', DEMO_RATE_LIMIT_PER_IP + 1).all();
  if (recentByIp.results.length > DEMO_RATE_LIMIT_PER_IP) {
    return jsonResponse(429, { ok: false, error: 'Too many demo sessions from this IP' });
  }

  const tid = crypto.randomUUID();
  const rid = crypto.randomUUID();
  const controlToken = randomToken();
  const controlTokenHash = await sha256Hex(controlToken);

  const normalLink = `${railBase}/test/control?tid=${encodeURIComponent(tid)}&token=${encodeURIComponent(controlToken)}`;
  const protectedDest = `${MARKETING_BASE}/test/protected?tid=${encodeURIComponent(tid)}`;
  const protectedLink = `${railBase}/r/${rid}#u=${encodeURIComponent(protectedDest)}`;

  await env.EIG_DB.prepare(
    `INSERT INTO live_tests (tid, created_at, email_hash, creator_ip_hash, protected_rid, control_token_hash)
     VALUES (?, ?, 'demo', ?, ?, ?)`
  ).bind(tid, now, ipHash, rid, controlTokenHash).run();
  await env.EIG_DB.prepare(
    'INSERT INTO control_tokens (tid, token_hash) VALUES (?, ?)'
  ).bind(tid, controlTokenHash).run();
  await insertLiveTestEvent(
    env,
    crypto.randomUUID(),
    tid,
    '',
    'demo_created',
    now,
    JSON.stringify({ normalLink, protectedLink })
  );

  return jsonResponse(200, { ok: true, tid, normalLink, protectedLink });
}

/** Parse simulate body: JSON, double-encoded JSON, or form-encoded. */
function parseSimulateBody(raw: string): { tid?: string; variant?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as { tid?: string; variant?: string };
    }
    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed) as { tid?: string; variant?: string };
      } catch {
        // inner string not valid JSON
      }
    }
  } catch {
    // Double-encoded: first parse failed; try JSON.parse(JSON.parse(raw)) if quoted
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      try {
        const once = JSON.parse(trimmed) as string;
        return JSON.parse(once) as { tid?: string; variant?: string };
      } catch {
        // fall through
      }
    }
    // Form-encoded: tid=xxx&variant=normal
    if (trimmed.includes('=')) {
      const params = new URLSearchParams(trimmed);
      return Object.fromEntries(params.entries()) as { tid?: string; variant?: string };
    }
  }
  return null;
}

/** POST /test/simulate — body: { tid, variant: "normal" | "protected" }. Simulate scanner open. */
export async function handleTestSimulate(request: Request, env: LiveTestEnv): Promise<Response> {
  let raw: string;
  try {
    raw = await request.text();
  } catch (e) {
    return jsonResponse(400, { ok: false, error: 'Invalid body', detail: String(e) });
  }
  const body = parseSimulateBody(raw);
  if (body == null) {
    return jsonResponse(400, {
      ok: false,
      error: 'Invalid JSON',
      rawPreview: raw.slice(0, 200),
      rawCharCodes: Array.from(raw.slice(0, 60)).map((c) => c.charCodeAt(0)),
    });
  }
  const tid = typeof body.tid === 'string' ? body.tid.trim() : '';
  const variant = body.variant === 'normal' || body.variant === 'protected' ? body.variant : null;
  if (!tid || !variant) {
    return jsonResponse(400, { ok: false, error: 'Missing fields', got: body });
  }

  const eventRow = await env.EIG_DB.prepare(
    "SELECT meta FROM live_test_events WHERE tid = ? AND kind = 'demo_created' ORDER BY created_at DESC LIMIT 1"
  ).bind(tid).first<{ meta: string | null }>();
  if (!eventRow?.meta) {
    return jsonResponse(404, { ok: false, error: 'not_found' });
  }
  let meta: { normalLink?: string; protectedLink?: string };
  try {
    meta = JSON.parse(eventRow.meta) as { normalLink?: string; protectedLink?: string };
  } catch {
    return jsonResponse(500, { ok: false, error: 'Invalid demo session data' });
  }

  const now = Date.now();

  if (variant === 'normal') {
    const link = meta.normalLink;
    if (!link) {
      return jsonResponse(400, { ok: false, error: 'Demo session has no normal link' });
    }
    // Exact same handler as production GET /test/control (real scanner open)
    const syntheticRequest = new Request(link, {
      method: 'GET',
      headers: new Headers({
        'User-Agent': SCANNER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Sec-Fetch-Mode': 'navigate',
      }),
    });
    const controlRes = await handleTestControl(syntheticRequest, env);
    const consumed = controlRes.headers.get('X-Consumed') === 'true';
    const reason = consumed ? 'first_hit' : 'already_consumed';
    await insertLiveTestEvent(
      env,
      crypto.randomUUID(),
      tid,
      'normal',
      'scanner_simulated',
      now,
      JSON.stringify({ fetch_status: controlRes.status, consumed, reason, note: 'simulated' })
    );
    return jsonResponse(200, {
      ok: true,
      tid,
      variant: 'normal',
      simulated_at: now,
      fetch_status: controlRes.status,
      consumed,
      reason,
    });
  }

  if (variant === 'protected') {
    if (!meta.protectedLink) {
      return jsonResponse(400, { ok: false, error: 'Demo session has no protected link' });
    }
    const ridMatch = meta.protectedLink.match(/\/r\/([^/#?]+)/);
    const rid = ridMatch ? ridMatch[1] : null;
    if (!rid) {
      return jsonResponse(400, { ok: false, error: 'Invalid protected link' });
    }
    const railUrl = meta.protectedLink.split('#')[0];
    const syntheticRequest = new Request(railUrl, {
      method: 'GET',
      headers: new Headers({ 'User-Agent': SCANNER_UA }),
    });
    const res = await handleGetRail(syntheticRequest, env as unknown as RailEnv, rid);
    if (res.status !== 200) {
      return jsonResponse(502, {
        ok: false,
        error: 'Rail returned non-200',
        fetch_status: res.status,
      });
    }
    if (res.headers.get('Location')) {
      return jsonResponse(502, {
        ok: false,
        error: 'Rail must not redirect on GET (scanner-safe)',
        fetch_status: res.status,
      });
    }
    await insertLiveTestEvent(
      env,
      crypto.randomUUID(),
      tid,
      'protected',
      'scanner_simulated',
      now,
      JSON.stringify({ fetch_status: 200, consumed: false, reason: 'interstitial_only', note: 'simulated' })
    );
    return jsonResponse(200, {
      ok: true,
      tid,
      variant: 'protected',
      simulated_at: now,
      fetch_status: 200,
      consumed: false,
      reason: 'interstitial_only',
    });
  }

  return jsonResponse(400, { ok: false, error: 'Invalid variant' });
}

/** GET /test/control?tid=...&token=... — atomic consume on first valid request; 410 on replay. */
export async function handleTestControl(request: Request, env: LiveTestEnv): Promise<Response> {
  const url = new URL(request.url);
  const tid = url.searchParams.get('tid')?.trim();
  const token = url.searchParams.get('token')?.trim();
  if (!tid || !token) {
    return htmlResponse(400, 'Missing tid or token');
  }

  const tokenHash = await sha256Hex(token);
  const ua = request.headers.get('User-Agent') || '';
  const consumedBy = ua.includes('Safe Links') || ua.includes('Microsoft Office') ? 'scanner' : 'user';
  const now = Date.now();

  const result = await env.EIG_DB.prepare(
    'UPDATE control_tokens SET consumed_at = ?, consumed_by = ? WHERE tid = ? AND token_hash = ? AND consumed_at IS NULL'
  ).bind(now, consumedBy, tid, tokenHash).run();

  const changed = (result as { meta?: { rows_written?: number } }).meta?.rows_written === 1;
  if (changed) {
    return redirectResult(tid, 0, true);
  }

  const row = await env.EIG_DB.prepare(
    'SELECT consumed_at FROM control_tokens WHERE tid = ? AND token_hash = ?'
  ).bind(tid, tokenHash).first<{ consumed_at: number | null }>();
  if (!row) {
    return redirectResult(tid, 1, false);
  }
  return goneResponse(tid, false);
}

function redirectResult(tid: string, used: 0 | 1, consumed: boolean): Response {
  const loc = `${MARKETING_BASE}/test/control/result?tid=${encodeURIComponent(tid)}&used=${used}`;
  const headers = new Headers({ Location: loc, 'X-Consumed': consumed ? 'true' : 'false' });
  return new Response(null, { status: 302, headers });
}

function goneResponse(tid: string, consumed: boolean): Response {
  return new Response('Gone', {
    status: 410,
    headers: { 'Content-Type': 'text/plain', 'X-Consumed': consumed ? 'true' : 'false' },
  });
}

/** GET /test/status?tid=... — JSON status; normal_user_result from control_tokens.consumed_by. */
export async function handleTestStatus(request: Request, env: LiveTestEnv): Promise<Response> {
  const url = new URL(request.url);
  const tid = url.searchParams.get('tid')?.trim();
  if (!tid) {
    return jsonResponse(400, { ok: false, error: 'tid required' });
  }
  const sessionRow = await env.EIG_DB.prepare(
    'SELECT tid, created_at FROM live_tests WHERE tid = ?'
  ).bind(tid).first<{ tid: string; created_at: number }>();
  if (!sessionRow) {
    return jsonResponse(404, { ok: false, error: 'not_found' });
  }

  const controlRow = await env.EIG_DB.prepare(
    'SELECT consumed_at, consumed_by FROM control_tokens WHERE tid = ?'
  ).bind(tid).first<{ consumed_at: number | null; consumed_by: string | null }>();

  const events = await env.EIG_DB.prepare(
    'SELECT kind, variant, created_at FROM live_test_events WHERE tid = ? ORDER BY created_at ASC'
  ).bind(tid).all<{ kind: string; variant: string; created_at: number }>();

  let scanner_simulated_normal_count = 0;
  let scanner_simulated_protected_count = 0;
  let last_scanner_simulated_normal_at: number | null = null;
  let last_scanner_simulated_protected_at: number | null = null;
  let redeem_ok_at: number | null = null;

  for (const e of events.results) {
    if (e.kind === 'scanner_simulated' && e.variant === 'normal') {
      scanner_simulated_normal_count++;
      last_scanner_simulated_normal_at = e.created_at;
    } else if (e.kind === 'scanner_simulated' && e.variant === 'protected') {
      scanner_simulated_protected_count++;
      last_scanner_simulated_protected_at = e.created_at;
    } else if (e.kind === 'redeem_ok') {
      redeem_ok_at = e.created_at;
    }
  }

  const normal_user_result =
    controlRow?.consumed_by === 'scanner'
      ? 'consumed_by_scanner'
      : controlRow?.consumed_by === 'user'
        ? 'consumed_by_user'
        : 'available';
  const control_consumed_at = controlRow?.consumed_at ?? null;
  const protected_user_result = redeem_ok_at != null ? 'redeemed' : 'available';

  return jsonResponse(200, {
    ok: true,
    tid: sessionRow.tid,
    created_at: sessionRow.created_at,
    scanner_simulated_normal_count,
    scanner_simulated_protected_count,
    last_scanner_simulated_normal_at,
    last_scanner_simulated_protected_at,
    control_consumed_at,
    control_first_hit_at: control_consumed_at,
    redeem_ok_at,
    normal_user_result,
    protected_user_result,
  });
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function htmlResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
