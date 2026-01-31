/**
 * Live Inbox Test: send real email with protected + control links; control consumed server-side.
 * Demo (no email): POST /test/create, POST /test/simulate, GET /test/status
 * POST /test/send, GET /test/control, GET /test/status
 */

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
    // Simulate by invoking internal /test/control logic (no external fetch)
    const syntheticRequest = new Request(link, {
      method: 'GET',
      headers: new Headers({ 'User-Agent': SCANNER_UA }),
    });
    await handleTestControl(syntheticRequest, env);
    await insertLiveTestEvent(
      env,
      crypto.randomUUID(),
      tid,
      'normal',
      'scanner_simulated',
      now,
      JSON.stringify({ fetch_status: 200, note: 'simulated' })
    );
    return jsonResponse(200, {
      ok: true,
      tid,
      variant: 'normal',
      simulated_at: now,
      fetch_status: 200,
    });
  }

  if (variant === 'protected') {
    if (!meta.protectedLink) {
      return jsonResponse(400, { ok: false, error: 'Demo session has no protected link' });
    }
    // Protected rail: scanner GET does not redeem; just record simulation (no external fetch)
    await insertLiveTestEvent(
      env,
      crypto.randomUUID(),
      tid,
      'protected',
      'scanner_simulated',
      now,
      JSON.stringify({ fetch_status: 200, note: 'simulated' })
    );
    return jsonResponse(200, {
      ok: true,
      tid,
      variant: 'protected',
      simulated_at: now,
      fetch_status: 200,
    });
  }

  return jsonResponse(400, { ok: false, error: 'Invalid variant' });
}

/** GET /test/control?tid=...&token=... — consume token, redirect to marketing result page */
export async function handleTestControl(request: Request, env: LiveTestEnv): Promise<Response> {
  const url = new URL(request.url);
  const tid = url.searchParams.get('tid')?.trim();
  const token = url.searchParams.get('token')?.trim();
  if (!tid || !token) {
    return htmlResponse(400, 'Missing tid or token');
  }

  const row = await env.EIG_DB.prepare(
    'SELECT control_token_hash FROM live_tests WHERE tid = ?'
  ).bind(tid).first<{ control_token_hash: string }>();
  if (!row) {
    return redirectResult(tid, 1);
  }
  const tokenHash = await sha256Hex(token);
  if (tokenHash !== row.control_token_hash) {
    return redirectResult(tid, 1);
  }

  const now = Date.now();
  const alreadyUsed = await env.EIG_DB.prepare(
    "SELECT 1 FROM live_test_events WHERE tid = ? AND kind = 'control_first_hit' LIMIT 1"
  ).bind(tid).first();
  if (alreadyUsed) {
    await insertLiveTestEvent(env, crypto.randomUUID(), tid, '', 'control_replay', now, null);
    return redirectResult(tid, 1);
  }

  await insertLiveTestEvent(env, crypto.randomUUID(), tid, '', 'control_first_hit', now, null);
  return redirectResult(tid, 0);
}

function redirectResult(tid: string, used: 0 | 1): Response {
  const loc = `${MARKETING_BASE}/test/control/result?tid=${encodeURIComponent(tid)}&used=${used}`;
  return new Response(null, { status: 302, headers: { Location: loc } });
}

/** GET /test/status?tid=... — JSON status from live_test_events (counts, timestamps, user results) */
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

  const events = await env.EIG_DB.prepare(
    'SELECT kind, variant, created_at FROM live_test_events WHERE tid = ? ORDER BY created_at ASC'
  ).bind(tid).all<{ kind: string; variant: string; created_at: number }>();

  let scanner_simulated_normal_count = 0;
  let scanner_simulated_protected_count = 0;
  let last_scanner_simulated_normal_at: number | null = null;
  let last_scanner_simulated_protected_at: number | null = null;
  let control_first_hit_at: number | null = null;
  let redeem_ok_at: number | null = null;

  for (const e of events.results) {
    if (e.kind === 'scanner_simulated' && e.variant === 'normal') {
      scanner_simulated_normal_count++;
      last_scanner_simulated_normal_at = e.created_at;
    } else if (e.kind === 'scanner_simulated' && e.variant === 'protected') {
      scanner_simulated_protected_count++;
      last_scanner_simulated_protected_at = e.created_at;
    } else if (e.kind === 'control_first_hit') {
      control_first_hit_at = e.created_at;
    } else if (e.kind === 'redeem_ok') {
      redeem_ok_at = e.created_at;
    }
  }

  const normal_user_result =
    control_first_hit_at != null
      ? (scanner_simulated_normal_count > 0 ? 'consumed_by_scanner' : 'consumed_by_user')
      : scanner_simulated_normal_count > 0
        ? 'consumed_by_scanner'
        : 'available';
  const protected_user_result = redeem_ok_at != null ? 'redeemed' : 'available';

  return jsonResponse(200, {
    ok: true,
    tid: sessionRow.tid,
    created_at: sessionRow.created_at,
    scanner_simulated_normal_count,
    scanner_simulated_protected_count,
    last_scanner_simulated_normal_at,
    last_scanner_simulated_protected_at,
    control_first_hit_at,
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
