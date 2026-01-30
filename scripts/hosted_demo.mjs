#!/usr/bin/env node

/**
 * Hosted demo script (multi-tenant Host routing)
 *
 * Creates a site for hostname "customer.local", then performs the demo flow using:
 *   Host: customer.local
 *
 * Verifies receipts include hostname "customer.local".
 *
 * Env:
 *  - BASE_URL (default http://127.0.0.1:8787)
 *  - ADMIN_API_KEY (default kuk)
 *  - HOSTNAME (default customer.local)
 */

import http from 'node:http';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'kuk';
const HOSTNAME = (process.env.HOSTNAME || 'customer.local').toLowerCase();

function requestHttp(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function sha256hex(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function extractCookie(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const v of values) {
    const m = v.match(new RegExp(`^${name}=([^;]+)`));
    if (m) return m[1];
  }
  return null;
}

async function main() {
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`HOSTNAME: ${HOSTNAME}\n`);

  // 1) Create site
  console.log('=== Step 1: POST /admin/sites (create site) ===');
  const createBody = JSON.stringify({
    hostname: HOSTNAME,
    originBaseUrl: 'http://127.0.0.1:8787',
    pathAllowlist: ['/demo', '/auth'],
    queryAllowlist: ['token', 'type', 'redirect_to', 'next', 'state'],
    turnstileEnabled: false,
    turnstileSiteKey: '',
  });

  const createRes = await requestHttp(`${BASE_URL}/admin/sites`, {
    method: 'POST',
    headers: {
      Host: '127.0.0.1',
      Authorization: `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(createBody),
    },
    body: createBody,
  });

  let sat;
  let siteId;

  if (createRes.status === 200) {
    const created = JSON.parse(createRes.body);
    sat = created.sat;
    siteId = created.siteId;
    console.log(`✓ created siteId=${siteId}`);
    console.log(`✓ got SAT (only once)\n`);
  } else if (createRes.status === 409) {
    console.log('Site already exists; rotating SAT...\n');

    // Fetch existing site by hostname (admin auth)
    const getRes = await requestHttp(`${BASE_URL}/admin/sites/${encodeURIComponent(HOSTNAME)}`, {
      method: 'GET',
      headers: {
        Host: '127.0.0.1',
        Authorization: `Bearer ${ADMIN_API_KEY}`,
      },
    });
    if (getRes.status !== 200) {
      console.error(`✗ failed to GET site by hostname: ${getRes.status}`);
      console.error(getRes.body);
      process.exit(1);
    }
    const existing = JSON.parse(getRes.body);
    siteId = existing.siteId;

    // Rotate SAT to obtain a usable token
    const rotateRes = await requestHttp(`${BASE_URL}/admin/sites/${encodeURIComponent(siteId)}/rotate-sat`, {
      method: 'POST',
      headers: {
        Host: '127.0.0.1',
        Authorization: `Bearer ${ADMIN_API_KEY}`,
      },
    });
    if (rotateRes.status !== 200) {
      console.error(`✗ rotate-sat failed: ${rotateRes.status}`);
      console.error(rotateRes.body);
      process.exit(1);
    }
    const rotated = JSON.parse(rotateRes.body);
    sat = rotated.sat;
    console.log(`✓ rotated SAT for siteId=${siteId}\n`);
  } else {
    console.error(`✗ create site failed: ${createRes.status}`);
    console.error(createRes.body);
    process.exit(1);
  }

  // 2) GET /l/demo/consume?token=hello123 with Host override
  console.log('=== Step 2: GET /l/demo/consume?token=hello123 (Host routing) ===');
  const lRes = await requestHttp(`${BASE_URL}/l/demo/consume?token=hello123`, {
    method: 'GET',
    headers: {
      Host: HOSTNAME,
      'User-Agent': 'hosted_demo.mjs',
    },
  });
  if (lRes.status !== 200) {
    console.error(`✗ /l failed: ${lRes.status}`);
    console.error(lRes.body);
    process.exit(1);
  }

  const continuity = extractCookie(lRes.headers['set-cookie'], 'continuity');
  if (!continuity) {
    console.error('✗ missing continuity cookie');
    process.exit(1);
  }

  const nonceMatch = lRes.body.match(/data-nonce="([^"]+)"/);
  const seedMatch = lRes.body.match(/data-seed="([^"]+)"/);
  if (!nonceMatch || !seedMatch) {
    console.error('✗ failed to parse nonce/proofSeed from interstitial HTML');
    process.exit(1);
  }
  const nonce = nonceMatch[1].trim();
  const proofSeed = seedMatch[1].trim();
  console.log(`✓ nonce=${nonce}`);
  console.log(`✓ proofSeed=${proofSeed}\n`);

  // 3) POST /v/:nonce to redeem
  console.log('=== Step 3: POST /v/:nonce (redeem) ===');
  const sig = await sha256hex(`${continuity}:${nonce}:${proofSeed}`);
  const formBody = `signature=${encodeURIComponent(sig)}&proofSeed=${encodeURIComponent(proofSeed)}`;

  const vRes = await requestHttp(`${BASE_URL}/v/${nonce}`, {
    method: 'POST',
    headers: {
      Host: HOSTNAME,
      Cookie: `continuity=${continuity}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formBody),
    },
    body: formBody,
  });

  if (vRes.status !== 302) {
    console.error(`✗ redeem expected 302, got ${vRes.status}`);
    console.error(vRes.body);
    process.exit(1);
  }
  console.log(`✓ redirect Location: ${vRes.headers.location}\n`);

  // 4) GET /r/events with SAT header, Host override
  console.log('=== Step 4: GET /r/events (SAT auth + Host routing) ===');
  const rRes = await requestHttp(`${BASE_URL}/r/events?limit=50`, {
    method: 'GET',
    headers: {
      Host: HOSTNAME,
      Authorization: `Bearer ${sat}`,
    },
  });
  if (rRes.status !== 200) {
    console.error(`✗ receipts failed: ${rRes.status}`);
    console.error(rRes.body);
    process.exit(1);
  }

  const data = JSON.parse(rRes.body);
  const events = data.events || [];
  const hasHost = events.some((e) => e.hostname === HOSTNAME);
  if (!hasHost) {
    console.error('✗ expected receipts to include hostname customer.local');
    console.error(events.slice(0, 5));
    process.exit(1);
  }
  console.log(`✓ receipts include hostname=${HOSTNAME}`);
  console.log('Last 5 events:');
  events.slice(0, 5).forEach((e) => {
    console.log(`- ${new Date(e.timestamp).toISOString()} ${e.action} nonce=${e.nonce} host=${e.hostname}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

