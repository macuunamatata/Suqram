#!/usr/bin/env node

/**
 * Ops script: Fetch receipts summary using SAT header auth
 *
 * Usage:
 *   SAT=... node scripts/summary.mjs
 *
 * Optional:
 *   BASE_URL=http://127.0.0.1:8787 SAT=... node scripts/summary.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const SAT = process.env.SAT;

if (!SAT) {
  console.error('✗ Missing SAT env var');
  console.error('Example: SAT=your_site_access_token node scripts/summary.mjs');
  process.exit(1);
}

async function main() {
  const url = `${BASE_URL}/r/summary.json`;
  console.log(`GET ${url}\n`);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SAT}`,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ ${res.status}`);
    console.error(text);
    process.exit(1);
  }

  try {
    const json = JSON.parse(text);
    console.log(JSON.stringify(json, null, 2));
  } catch {
    console.log(text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

