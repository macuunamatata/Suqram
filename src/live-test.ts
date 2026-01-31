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
    `INSERT INTO live_tests (tid, created_at, email_hash, creator_ip_hash, protected_rid, control_token_hash, control_consumed_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`
  ).bind(tid, now, emailHash, ipHash, rid, controlTokenHash).run();
  await env.EIG_DB.prepare(
    'INSERT INTO live_test_events (tid, ts, kind) VALUES (?, ?, ?)'
  ).bind(tid, now, 'sent').run();

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
    `INSERT INTO live_tests (tid, created_at, email_hash, creator_ip_hash, protected_rid, control_token_hash, control_consumed_at, normal_link, protected_link)
     VALUES (?, ?, 'demo', ?, ?, ?, NULL, ?, ?)`
  ).bind(tid, now, ipHash, rid, controlTokenHash, normalLink, protectedLink).run();
  await env.EIG_DB.prepare(
    'INSERT INTO live_test_events (tid, ts, kind) VALUES (?, ?, ?)'
  ).bind(tid, now, 'demo_created').run();

  return jsonResponse(200, { ok: true, tid, normalLink, protectedLink });
}

/** POST /test/simulate — body: { tid, variant: "normal" | "protected" }. Simulate scanner open. */
export async function handleTestSimulate(request: Request, env: LiveTestEnv): Promise<Response> {
  let raw: string;
  try {
    raw = await request.clone().text();
  } catch (e) {
    return jsonResponse(400, { ok: false, error: 'Invalid body', detail: String(e) });
  }
  let body: { tid?: string; variant?: string };
  try {
    body = JSON.parse(raw) as { tid?: string; variant?: string };
  } catch (e) {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON', detail: String(e) });
  }
  const tid = typeof body?.tid === 'string' ? body.tid.trim() : '';
  const variant = body?.variant === 'normal' || body?.variant === 'protected' ? body.variant : null;
  if (!tid || !variant) {
    return jsonResponse(400, { ok: false, error: 'tid and variant (normal|protected) required' });
  }

  const row = await env.EIG_DB.prepare(
    'SELECT normal_link, protected_link, control_consumed_at FROM live_tests WHERE tid = ?'
  ).bind(tid).first<{ normal_link: string | null; protected_link: string | null; control_consumed_at: number | null }>();
  if (!row) {
    return jsonResponse(404, { ok: false, error: 'not_found' });
  }

  const now = Date.now();

  if (variant === 'normal') {
    const link = row.normal_link;
    if (!link) {
      return jsonResponse(400, { ok: false, error: 'Demo session has no normal link' });
    }
    const res = await fetch(link, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': SCANNER_UA },
    });
    await env.EIG_DB.prepare(
      'UPDATE live_tests SET control_consumed_at = ?, normal_scanner_seen_at = ? WHERE tid = ?'
    ).bind(now, now, tid).run();
    await env.EIG_DB.prepare(
      'INSERT INTO live_test_events (tid, ts, kind) VALUES (?, ?, ?)'
    ).bind(tid, now, 'normal_simulate').run();
    return jsonResponse(200, {
      ok: true,
      variant: 'normal',
      status: 'consumed',
      details: `Scanner (simulated) opened normal link; status ${res.status}`,
    });
  }

  if (variant === 'protected') {
    const link = row.protected_link;
    if (!link) {
      return jsonResponse(400, { ok: false, error: 'Demo session has no protected link' });
    }
    await fetch(link, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': SCANNER_UA },
    });
    await env.EIG_DB.prepare(
      'UPDATE live_tests SET protected_scanner_seen_at = ? WHERE tid = ?'
    ).bind(now, tid).run();
    await env.EIG_DB.prepare(
      'INSERT INTO live_test_events (tid, ts, kind) VALUES (?, ?, ?)'
    ).bind(tid, now, 'protected_simulate').run();
    return jsonResponse(200, {
      ok: true,
      variant: 'protected',
      status: 'scanner_fetch_ignored',
      details: 'Protected link did not redeem; scanner fetch recorded.',
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
    'SELECT control_token_hash, control_consumed_at FROM live_tests WHERE tid = ?'
  ).bind(tid).first<{ control_token_hash: string; control_consumed_at: number | null }>();
  if (!row) {
    return redirectResult(tid, 1);
  }
  const tokenHash = await sha256Hex(token);
  if (tokenHash !== row.control_token_hash) {
    return redirectResult(tid, 1);
  }

  const now = Date.now();
  if (row.control_consumed_at != null) {
    await env.EIG_DB.prepare(
      'INSERT INTO live_test_events (tid, ts, kind) VALUES (?, ?, ?)'
    ).bind(tid, now, 'control_replay').run();
    return redirectResult(tid, 1);
  }

  await env.EIG_DB.prepare(
    'UPDATE live_tests SET control_consumed_at = ? WHERE tid = ?'
  ).bind(now, tid).run();
  await env.EIG_DB.prepare(
    'INSERT INTO live_test_events (tid, ts, kind) VALUES (?, ?, ?)'
  ).bind(tid, now, 'control_first_hit').run();
  return redirectResult(tid, 0);
}

function redirectResult(tid: string, used: 0 | 1): Response {
  const loc = `${MARKETING_BASE}/test/control/result?tid=${encodeURIComponent(tid)}&used=${used}`;
  return new Response(null, { status: 302, headers: { Location: loc } });
}

/** GET /test/status?tid=... — JSON status (created_at, scanner timestamps, user results) */
export async function handleTestStatus(request: Request, env: LiveTestEnv): Promise<Response> {
  const url = new URL(request.url);
  const tid = url.searchParams.get('tid')?.trim();
  if (!tid) {
    return jsonResponse(400, { error: 'tid required' });
  }
  const row = await env.EIG_DB.prepare(
    `SELECT tid, created_at, protected_rid, control_consumed_at,
            normal_scanner_seen_at, protected_scanner_seen_at, protected_redeemed_at
     FROM live_tests WHERE tid = ?`
  ).bind(tid).first<{
    tid: string;
    created_at: number;
    protected_rid: string;
    control_consumed_at: number | null;
    normal_scanner_seen_at: number | null;
    protected_scanner_seen_at: number | null;
    protected_redeemed_at: number | null;
  }>();
  if (!row) {
    return jsonResponse(404, { error: 'not_found' });
  }
  const normal_user_result = row.control_consumed_at != null
    ? (row.normal_scanner_seen_at != null ? 'consumed_by_scanner' : 'consumed_by_user')
    : 'available';
  const protected_user_result = row.protected_redeemed_at != null ? 'redeemed' : 'available';
  return jsonResponse(200, {
    tid: row.tid,
    created_at: row.created_at,
    normal_scanner_seen_at: row.normal_scanner_seen_at ?? null,
    protected_scanner_seen_at: row.protected_scanner_seen_at ?? null,
    normal_user_result,
    protected_user_result,
    control_consumed_at: row.control_consumed_at ?? null,
    protected_redeemed_at: row.protected_redeemed_at ?? null,
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
