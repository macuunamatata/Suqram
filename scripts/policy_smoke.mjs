#!/usr/bin/env node

/**
 * policy_smoke.mjs
 *
 * Smoke test for /r/policy.json (SAT-scoped per-site policy).
 *
 * Flow:
 *  - Create or rotate a site for hostname "customer.local"
 *  - Fetch /r/policy.json with Authorization: Bearer <SAT>
 *  - Assert that policy matches configured originBaseUrl, pathAllowlist, queryAllowlist
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const HOSTNAME = (process.env.HOSTNAME || 'customer.local').toLowerCase();
const EXPECTED_ORIGIN = process.env.ORIGIN_BASE_URL || 'http://127.0.0.1:8787';
const EXPECTED_PATH_ALLOWLIST = ['/auth', '/demo'];
const EXPECTED_QUERY_ALLOWLIST = ['token', 'type', 'redirect_to', 'next', 'state'];

function readAdminApiKey() {
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

  console.log('=== Create or rotate site for customer.local ===');

  const body = {
    hostname: HOSTNAME,
    originBaseUrl: EXPECTED_ORIGIN,
    pathAllowlist: EXPECTED_PATH_ALLOWLIST,
    queryAllowlist: EXPECTED_QUERY_ALLOWLIST,
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

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function main() {
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`HOSTNAME: ${HOSTNAME}`);
  console.log(`EXPECTED_ORIGIN: ${EXPECTED_ORIGIN}\n`);

  const { sat } = await createOrRotateSite();

  console.log('=== Fetch /r/policy.json with SAT ===');
  const res = await fetch(`${BASE_URL}/r/policy.json`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${sat}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`/r/policy.json failed: ${res.status} ${txt}`);
  }

  const policy = await res.json();
  console.log('Policy:', JSON.stringify(policy, null, 2));

  if (policy.hostname !== HOSTNAME) {
    throw new Error(`hostname mismatch: expected ${HOSTNAME}, got ${policy.hostname}`);
  }

  if (policy.originBaseUrl !== EXPECTED_ORIGIN) {
    throw new Error(`originBaseUrl mismatch: expected ${EXPECTED_ORIGIN}, got ${policy.originBaseUrl}`);
  }

  if (!arraysEqual(policy.pathAllowlist || [], EXPECTED_PATH_ALLOWLIST)) {
    throw new Error(`pathAllowlist mismatch: expected ${JSON.stringify(EXPECTED_PATH_ALLOWLIST)}, got ${JSON.stringify(policy.pathAllowlist)}`);
  }

  if (!arraysEqual(policy.queryAllowlist || [], EXPECTED_QUERY_ALLOWLIST)) {
    throw new Error(`queryAllowlist mismatch: expected ${JSON.stringify(EXPECTED_QUERY_ALLOWLIST)}, got ${JSON.stringify(policy.queryAllowlist)}`);
  }

  console.log('\n✓ /r/policy.json matches configured allowlists and originBaseUrl.');
}

main().catch((err) => {
  console.error('✗ policy_smoke failed:', err.message || err);
  process.exit(1);
});

