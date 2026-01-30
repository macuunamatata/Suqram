#!/usr/bin/env node

/**
 * receipts_sat_smoke.mjs
 *
 * Smoke test for SAT-based receipts access (no Host header scoping).
 *
 * Flow:
 *  a) Create (or upsert) a site for hostname "customer.local" via admin API
 *  b) Run redeem_demo.mjs against Host: customer.local (Phase A + B)
 *  c) Call /r/export.json with ONLY Authorization: Bearer <SAT> (no custom Host header)
 *  d) Assert:
 *     - events.length >= 2
 *     - all events.hostname === "customer.local"
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const HOSTNAME = (process.env.HOSTNAME || 'customer.local').toLowerCase();

function readAdminApiKey() {
  // Prefer explicit env, fall back to .dev.vars
  if (process.env.ADMIN_API_KEY && process.env.ADMIN_API_KEY.trim()) {
    return process.env.ADMIN_API_KEY.trim();
  }

  const devVarsPath = join(process.cwd(), '.dev.vars');
  try {
    const content = readFileSync(devVarsPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('ADMIN_API_KEY=')) {
        const key = trimmed.substring('ADMIN_API_KEY='.length).trim();
        if (key) return key;
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('.dev.vars not found. Run: npm run setup:dev');
    }
    throw err;
  }

  throw new Error('ADMIN_API_KEY not found in environment or .dev.vars');
}

async function createOrRotateSite() {
  const adminKey = readAdminApiKey();

  console.log('=== A) Create or rotate site for customer.local ===');

  const body = {
    hostname: HOSTNAME,
    originBaseUrl: 'http://127.0.0.1:8787',
    pathAllowlist: ['/auth', '/demo'],
    queryAllowlist: ['token', 'type', 'redirect_to', 'next', 'state'],
    turnstileEnabled: false,
    turnstileSiteKey: '',
  };

  const createRes = await fetch(`${BASE_URL}/admin/sites`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let sat;
  let siteId;

  if (createRes.status === 200) {
    const json = await createRes.json();
    sat = json.sat;
    siteId = json.siteId;
    console.log(`✓ Created siteId=${siteId}`);
  } else if (createRes.status === 409) {
    console.log('Site already exists; fetching and rotating SAT...');

    // GET /admin/sites/:hostname to resolve siteId
    const getRes = await fetch(`${BASE_URL}/admin/sites/${encodeURIComponent(HOSTNAME)}`, {
      headers: {
        Authorization: `Bearer ${adminKey}`,
      },
    });
    if (!getRes.ok) {
      const txt = await getRes.text();
      throw new Error(`GET /admin/sites/${HOSTNAME} failed: ${getRes.status} ${txt}`);
    }
    const existing = await getRes.json();
    siteId = existing.siteId;

    const rotateRes = await fetch(`${BASE_URL}/admin/sites/${encodeURIComponent(siteId)}/rotate-sat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminKey}`,
      },
    });
    if (!rotateRes.ok) {
      const txt = await rotateRes.text();
      throw new Error(`POST /admin/sites/${siteId}/rotate-sat failed: ${rotateRes.status} ${txt}`);
    }
    const rotated = await rotateRes.json();
    sat = rotated.sat;
    console.log(`✓ Rotated SAT for siteId=${siteId}`);
  } else {
    const txt = await createRes.text();
    throw new Error(`POST /admin/sites failed: ${createRes.status} ${txt}`);
  }

  if (!sat) {
    throw new Error('SAT missing from admin response');
  }

  console.log(`SAT (first 16 chars): ${sat.substring(0, 16)}...\n`);
  return { sat, siteId };
}

function runRedeemDemo() {
  console.log('=== B) Run redeem_demo.mjs (Phase B without browser) ===');

  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['scripts/redeem_demo.mjs'],
      {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      }
    );

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`redeem_demo.mjs exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function checkReceiptsWithSat(sat) {
  console.log('=== C) Fetch /r/export.json with SAT (no Host header override) ===');

  const res = await fetch(`${BASE_URL}/r/export.json?limit=50`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${sat}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`/r/export.json failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const events = Array.isArray(data.events) ? data.events : [];

  console.log(`Total events returned: ${events.length}`);

  if (events.length < 2) {
    throw new Error('Expected at least 2 events (minted + redeemed) for customer.local');
  }

  const wrongHost = events.some((e) => e.hostname !== HOSTNAME);
  if (wrongHost) {
    console.log('Events:', events.slice(0, 5));
    throw new Error(`Expected all events.hostname === "${HOSTNAME}"`);
  }

  console.log('✓ SAT-scoped receipts look correct (hostname matches and events >= 2).');
}

async function main() {
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`HOSTNAME: ${HOSTNAME}\n`);

  const { sat } = await createOrRotateSite();
  await runRedeemDemo();
  await checkReceiptsWithSat(sat);
}

main().catch((err) => {
  console.error('✗ receipts_sat_smoke failed:', err.message || err);
  process.exit(1);
});

