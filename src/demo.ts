/**
 * Deterministic two-link demo: unprotected (breaks after scanner pre-open) vs protected (works).
 * POST /demo/create, POST /demo/scan, GET /demo/unprotected, GET /demo/success
 */

export interface DemoEnv {
  EIG_DB: D1Database;
}

const DEMO_RATE_LIMIT_PER_IP = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Clean "Link expired" page */
function renderExpiredPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link expired</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .box { text-align: center; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); max-width: 360px; }
    .icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    h1 { font-size: 1.25rem; color: #333; margin: 0 0 0.5rem; }
    p { color: #666; font-size: 0.95rem; margin: 0; }
  </style>
</head>
<body>
  <div class="box">
    <p class="icon" aria-hidden="true">&#x274C;</p>
    <h1>Link expired</h1>
    <p>This link was already opened by a security scanner. One-time links only work for the first open.</p>
  </div>
</body>
</html>`;
}

/** Clean "Success" page with optional counters */
function renderSuccessPage(tid: string, protectedScanCount: number, unprotectedScanCount: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Success</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .box { text-align: center; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); max-width: 360px; }
    .icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    h1 { font-size: 1.25rem; color: #333; margin: 0 0 0.5rem; }
    p { color: #666; font-size: 0.95rem; margin: 0; }
    .counters { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; font-size: 0.85rem; color: #888; }
  </style>
</head>
<body>
  <div class="box">
    <p class="icon" aria-hidden="true">&#x2705;</p>
    <h1>Success</h1>
    <p>You opened the protected link. It still worked because Suqram only redirects after you click Continue.</p>
    <div class="counters" aria-hidden="true">Scanner opens: ${unprotectedScanCount} unprotected, ${protectedScanCount} protected (not consumed).</div>
  </div>
</body>
</html>`;
}

/** POST /demo/create — create demo session, return unprotected_url, protected_url, display strings */
export async function handleDemoCreate(request: Request, env: DemoEnv, railBase: string): Promise<Response> {
  const now = Date.now();
  const since = now - RATE_WINDOW_MS;
  const countResult = await env.EIG_DB.prepare(
    'SELECT COUNT(*) as c FROM demo_sessions WHERE created_at > ?'
  ).bind(since).first<{ c: number }>();
  const count = countResult?.c ?? 0;
  if (count > DEMO_RATE_LIMIT_PER_IP) {
    return jsonResponse(429, { ok: false, error: 'Too many demo sessions from this IP' });
  }

  const tid = crypto.randomUUID();
  const rid = crypto.randomUUID();
  const unprotectedUrl = `${railBase}/demo/unprotected?tid=${encodeURIComponent(tid)}`;
  const successUrl = `${railBase}/demo/success?tid=${encodeURIComponent(tid)}`;
  const protectedUrl = `${railBase}/r/${rid}#u=${encodeURIComponent(successUrl)}`;

  await env.EIG_DB.prepare(
    `INSERT INTO demo_sessions (tid, created_at, unprotected_consumed_at, protected_scan_count, unprotected_scan_count)
     VALUES (?, ?, NULL, 0, 0)`
  ).bind(tid, now).run();

  return jsonResponse(200, {
    ok: true,
    tid,
    unprotected_url: unprotectedUrl,
    protected_url: protectedUrl,
    unprotected_display: 'https://app.example.com/auth/verify?token=••••••',
    protected_display: protectedUrl,
  });
}

/** POST /demo/scan — mark unprotected consumed, increment protected_scan_count (do NOT consume protected) */
export async function handleDemoScan(request: Request, env: DemoEnv): Promise<Response> {
  let body: { tid?: string };
  try {
    const raw = await request.text();
    body = raw ? (JSON.parse(raw) as { tid?: string }) : {};
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON' });
  }
  const tid = typeof body?.tid === 'string' ? body.tid.trim() : '';
  if (!tid) return jsonResponse(400, { ok: false, error: 'tid required' });

  const row = await env.EIG_DB.prepare(
    'SELECT unprotected_consumed_at, protected_scan_count, unprotected_scan_count FROM demo_sessions WHERE tid = ?'
  ).bind(tid).first<{ unprotected_consumed_at: number | null; protected_scan_count: number; unprotected_scan_count: number }>();
  if (!row) return jsonResponse(404, { ok: false, error: 'Demo session not found' });

  const now = Date.now();
  const unprotectedConsumedAt = row.unprotected_consumed_at ?? now;
  const newProtectedScanCount = row.protected_scan_count + 1;
  const newUnprotectedScanCount = row.unprotected_consumed_at == null ? row.unprotected_scan_count + 1 : row.unprotected_scan_count;

  await env.EIG_DB.prepare(
    `UPDATE demo_sessions SET unprotected_consumed_at = ?, protected_scan_count = ?, unprotected_scan_count = ? WHERE tid = ?`
  ).bind(unprotectedConsumedAt, newProtectedScanCount, newUnprotectedScanCount, tid).run();

  return jsonResponse(200, { ok: true });
}

/** GET /demo/unprotected?tid=... — if consumed => "Link expired"; else redirect to /demo/success */
export async function handleDemoUnprotected(request: Request, env: DemoEnv): Promise<Response> {
  const url = new URL(request.url);
  const tid = url.searchParams.get('tid')?.trim() ?? '';
  if (!tid) return htmlResponse(renderExpiredPage());

  const row = await env.EIG_DB.prepare(
    'SELECT unprotected_consumed_at FROM demo_sessions WHERE tid = ?'
  ).bind(tid).first<{ unprotected_consumed_at: number | null }>();
  if (!row) return htmlResponse(renderExpiredPage());

  if (row.unprotected_consumed_at != null) {
    return htmlResponse(renderExpiredPage());
  }
  const railBase = `${url.protocol}//${url.host}`;
  return new Response(null, {
    status: 302,
    headers: { Location: `${railBase}/demo/success?tid=${encodeURIComponent(tid)}`, 'Cache-Control': 'no-store' },
  });
}

/** GET /demo/success?tid=... — render Success page and optional counters */
export async function handleDemoSuccess(request: Request, env: DemoEnv): Promise<Response> {
  const url = new URL(request.url);
  const tid = url.searchParams.get('tid')?.trim() ?? '';

  let protectedScanCount = 0;
  let unprotectedScanCount = 0;
  if (tid) {
    const row = await env.EIG_DB.prepare(
      'SELECT protected_scan_count, unprotected_scan_count FROM demo_sessions WHERE tid = ?'
    ).bind(tid).first<{ protected_scan_count: number; unprotected_scan_count: number }>();
    if (row) {
      protectedScanCount = row.protected_scan_count;
      unprotectedScanCount = row.unprotected_scan_count;
    }
  }

  return htmlResponse(renderSuccessPage(tid, protectedScanCount, unprotectedScanCount));
}
