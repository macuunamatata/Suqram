#!/usr/bin/env node
// Auth Link Scanner Immunity Rail – Smoke Test
// Tests: scanner GET loop (zero redeemed), simulated human (GET + POST /redeem), replay denied

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { writeFileSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wranglerConfigPath = resolve(__dirname, '..', 'wrangler.toml');
const quotedConfig = `"${wranglerConfigPath}"`;

const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
let WORKER_URL = process.env.WORKER_URL || (isRemote ? process.env.PRODUCTION_URL : 'http://127.0.0.1:8787');

if (WORKER_URL && WORKER_URL.includes('<PORT>')) {
  console.error('❌ ERROR: WORKER_URL contains placeholder <PORT>. Set WORKER_URL to a valid URL (e.g. http://127.0.0.1:8787)');
  process.exit(1);
}

function detectD1Binding() {
  const cliArg = args.find((a) => a.startsWith('--db-binding='));
  if (cliArg) return cliArg.split('=')[1];
  if (process.env.D1_BINDING) return process.env.D1_BINDING;
  try {
    const content = readFileSync(resolve(__dirname, '..', 'wrangler.toml'), 'utf-8');
    const m = content.match(/\[\[d1_databases\]\][\s\S]*?binding\s*=\s*"([^"]+)"/);
    if (m && m[1]) return m[1];
  } catch (_) {}
  return 'EIG_DB';
}

const dbBinding = detectD1Binding();
const TEST_RID = `smoke-rid-${Date.now()}`;
const TEST_DESTINATION = 'https://example.com/success';

let passCount = 0;
let failCount = 0;

function log(message, isPass = null) {
  const prefix = isPass === true ? '✅ PASS' : isPass === false ? '❌ FAIL' : 'ℹ️  INFO';
  console.log(`${prefix}: ${message}`);
}

function assert(condition, message) {
  if (condition) {
    log(message, true);
    passCount++;
  } else {
    log(message, false);
    failCount++;
  }
}

function executeSQL(sql, description) {
  if (description) log(description);
  const tempFile = join(__dirname, '..', '.temp-smoke.sql');
  try {
    writeFileSync(tempFile, sql);
    const quotedFile = `"${tempFile}"`;
    const cmd = isRemote
      ? `wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedFile} --remote`
      : `wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedFile} --local`;
    execSync(cmd, { stdio: 'pipe' });
    unlinkSync(tempFile);
    return true;
  } catch (error) {
    log(`SQL execution failed: ${error.message}`, false);
    try {
      unlinkSync(tempFile);
    } catch (_) {}
    return false;
  }
}

function querySQL(sql) {
  const tempFile = join(__dirname, '..', '.temp-smoke-query.sql');
  try {
    writeFileSync(tempFile, sql);
    const quotedFile = `"${tempFile}"`;
    const cmd = isRemote
      ? `wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedFile} --remote --json`
      : `wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedFile} --local --json`;
    const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    unlinkSync(tempFile);
    const lines = output.trim().split('\n');
    const jsonLine = lines.find((l) => l.trim().startsWith('{'));
    if (jsonLine) return JSON.parse(jsonLine);
  } catch (_) {
    try {
      unlinkSync(tempFile);
    } catch (_) {}
  }
  return null;
}

async function ensureSchema() {
  log('Ensuring schema is applied...');
  const schemaPath = join(__dirname, '..', 'sql', 'schema.sql');
  const quotedSchema = `"${schemaPath}"`;
  const cmd = isRemote
    ? `wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedSchema} --remote`
    : `wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedSchema} --local`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    log('Schema applied', true);
    return true;
  } catch (error) {
    const err = (error.message || '').toString();
    if (err.includes('unexpected') && err.includes('dev')) {
      log('Schema applied (warnings ignored)', true);
      return true;
    }
    log(`Schema application failed: ${error.message}`, false);
    return false;
  }
}

function getRedemptionCount(rid) {
  const sql = `SELECT COUNT(*) as c FROM redemption_ledger WHERE rid = '${rid.replace(/'/g, "''")}' AND decision = 'redeemed'`;
  const result = querySQL(sql);
  return result?.results?.[0]?.c ?? 0;
}

function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return {};
  const cookieMap = {};
  const cookieStrings = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader.split(/,\s*(?=[a-zA-Z_][a-zA-Z0-9_]*=)/);
  for (const cookieStr of cookieStrings) {
    const match = cookieStr.trim().match(/^([^=]+)=([^;]+)/);
    if (match) cookieMap[match[1].trim()] = match[2].trim();
  }
  return cookieMap;
}

function buildCookieHeader(cookieMap) {
  return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractNonceFromHTML(html) {
  const patterns = [
    /name=["']nonce["']\s+value=["']([^"']+)["']/,
    /data-nonce=["']([^"']+)["']/,
    /var nonce = ["']([^"']+)["']/,
    /const nonce = ["']([^"']+)["']/,
    /"nonce":\s*["']([^"']+)["']/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

function findContinuityCookie(cookieMap) {
  for (const name of Object.keys(cookieMap)) {
    if (/continu|cont|cid|rail_continuity/i.test(name)) return { name, value: cookieMap[name] };
  }
  return null;
}

function findCSRFCookie(cookieMap) {
  for (const name of Object.keys(cookieMap)) {
    if (name.toLowerCase().includes('csrf')) return { name, value: cookieMap[name] };
  }
  return null;
}

function extractCSRFFromHTML(html) {
  const patterns = [/const csrfToken = ["']([^"']+)["']/, /name=["']csrf["']\s+value=["']([^"']+)["']/, /"csrf":\s*["']([^"']+)["']/];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

async function testHealthEndpoint() {
  log('Testing GET /health');
  const response = await fetch(`${WORKER_URL}/health`, { method: 'GET' });
  assert(response.status === 200, 'Health returns 200');
  const text = await response.text();
  assert(text === 'ok', 'Health body is "ok"');
}

async function testScannerGetLoop() {
  log('Testing scanner: 5 GETs to /r/:rid create ZERO redeemed records');
  const countBefore = getRedemptionCount(TEST_RID);
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${WORKER_URL}/r/${TEST_RID}`, {
      method: 'GET',
      headers: { 'User-Agent': 'smoke-test-agent', 'CF-Connecting-IP': '1.2.3.4' },
    });
    if (res.status === 200) log(`GET ${i + 1} returned 200`, true);
    else log(`GET ${i + 1} returned ${res.status}`, false);
    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('text/html')) log(`GET ${i + 1} returns HTML`, true);
    else log(`GET ${i + 1} Content-Type ${ct}`, false);
  }
  const countAfter = getRedemptionCount(TEST_RID);
  assert(countAfter === countBefore, `Zero redeemed (before: ${countBefore}, after: ${countAfter})`);
}

async function testSimulatedHuman() {
  log('Testing simulated human: GET /r/:rid then POST /redeem with u, nonce, csrf, cookies');
  const getRes = await fetch(`${WORKER_URL}/r/${TEST_RID}`, {
    method: 'GET',
    headers: { 'User-Agent': 'smoke-test-agent', 'CF-Connecting-IP': '1.2.3.4' },
  });
  if (getRes.status !== 200) {
    log(`GET failed: ${getRes.status}`, false);
    failCount++;
    return;
  }
  log('GET /r/:rid succeeded', true);
  passCount++;

  let setCookie = getRes.headers.get('Set-Cookie') || getRes.headers.get('set-cookie');
  try {
    const all = getRes.headers.getAll?.('Set-Cookie') || getRes.headers.getAll?.('set-cookie');
    if (all?.length) setCookie = all;
  } catch (_) {}
  const cookieMap = parseCookies(setCookie);
  const continuity = findContinuityCookie(cookieMap);
  const csrfCookie = findCSRFCookie(cookieMap);
  if (!continuity || !csrfCookie) {
    log('Missing continuity or CSRF cookie', false);
    failCount++;
    return;
  }

  const html = await getRes.text();
  const nonce = extractNonceFromHTML(html);
  if (!nonce) {
    log('Nonce not found in HTML', false);
    failCount++;
    return;
  }
  const csrfToken = extractCSRFFromHTML(html) || csrfCookie.value;
  const cookieHeader = buildCookieHeader(cookieMap);

  const formBody = new URLSearchParams();
  formBody.append('nonce', nonce);
  formBody.append('rid', TEST_RID);
  formBody.append('u', TEST_DESTINATION);
  formBody.append('csrf', csrfToken);

  const postRes = await fetch(`${WORKER_URL}/redeem`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
      'X-CSRF': csrfToken,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'smoke-test-agent',
      'CF-Connecting-IP': '1.2.3.4',
    },
    body: formBody.toString(),
  });

  if (postRes.status !== 200) {
    log(`POST /redeem returned ${postRes.status}`, false);
    failCount++;
    return;
  }
  const body = await postRes.json();
  if (body.ok !== true) {
    log(`POST /redeem returned ok: false, reason: ${body.reason}`, false);
    failCount++;
    return;
  }
  assert(body.redirect_to === TEST_DESTINATION, `redirect_to matches: ${body.redirect_to}`);
  log('Simulated human: ok true, redirect_to present', true);
  passCount++;
}

async function testReplayDenied() {
  log('Testing replay: second POST with same nonce returns REPLAY');
  const getRes = await fetch(`${WORKER_URL}/r/${TEST_RID}`, {
    method: 'GET',
    headers: { 'User-Agent': 'smoke-test-agent', 'CF-Connecting-IP': '1.2.3.4' },
  });
  if (getRes.status !== 200) {
    log('GET failed for replay test', false);
    failCount++;
    return;
  }
  let setCookie = getRes.headers.get('Set-Cookie') || getRes.headers.get('set-cookie');
  try {
    const all = getRes.headers.getAll?.('Set-Cookie') || getRes.headers.getAll?.('set-cookie');
    if (all?.length) setCookie = all;
  } catch (_) {}
  const cookieMap = parseCookies(setCookie);
  const continuity = findContinuityCookie(cookieMap);
  const csrfCookie = findCSRFCookie(cookieMap);
  if (!continuity || !csrfCookie) {
    log('Missing cookies for replay test', false);
    failCount++;
    return;
  }
  const html = await getRes.text();
  const nonce = extractNonceFromHTML(html);
  const csrfToken = extractCSRFFromHTML(html) || csrfCookie.value;
  const cookieHeader = buildCookieHeader(cookieMap);

  const formBody = new URLSearchParams();
  formBody.append('nonce', nonce);
  formBody.append('rid', TEST_RID);
  formBody.append('u', TEST_DESTINATION);
  formBody.append('csrf', csrfToken);

  const post1 = await fetch(`${WORKER_URL}/redeem`, {
    method: 'POST',
    headers: { Cookie: cookieHeader, 'X-CSRF': csrfToken, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'smoke-test-agent', 'CF-Connecting-IP': '1.2.3.4' },
    body: formBody.toString(),
  });
  const body1 = await post1.json();
  if (!body1.ok) {
    log(`First POST failed: ${body1.reason}`, false);
    failCount++;
    return;
  }

  const post2 = await fetch(`${WORKER_URL}/redeem`, {
    method: 'POST',
    headers: { Cookie: cookieHeader, 'X-CSRF': csrfToken, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'smoke-test-agent', 'CF-Connecting-IP': '1.2.3.4' },
    body: formBody.toString(),
  });
  const body2 = await post2.json();
  if (body2.ok === false && body2.reason === 'REPLAY') {
    log('Replay correctly denied (reason: REPLAY)', true);
    passCount++;
  } else {
    log(`Replay test: expected ok:false, reason:REPLAY; got ${JSON.stringify(body2)}`, false);
    failCount++;
  }
}

async function main() {
  console.log('🚀 Auth Link Scanner Immunity Rail – Smoke Test\n');
  console.log(`D1 binding: ${dbBinding}`);
  console.log(`Mode: ${isRemote ? 'REMOTE' : 'LOCAL'}`);
  console.log(`Worker URL: ${WORKER_URL}`);
  console.log(`Test rid: ${TEST_RID}\n`);

  try {
    if (!(await ensureSchema())) {
      console.error('❌ Schema failed');
      process.exit(1);
    }
    await testHealthEndpoint();
    await testScannerGetLoop();
    await testSimulatedHuman();
    await testReplayDenied();

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('='.repeat(50));
    if (failCount === 0) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Smoke test error:', error);
    process.exit(1);
  }
}

main();
