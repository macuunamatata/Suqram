#!/usr/bin/env node

/**
 * deploy_verify.mjs
 *
 * Simple sanity check for a deployed workers.dev instance.
 *
 * Usage:
 *   BASE_URL="https://scanner-safe-links.your-account.workers.dev" npm run deploy:verify
 *
 * Behavior:
 *   1) Calls /admin/ping (should be 500 missing_admin_api_key if ADMIN_API_KEY is not set)
 *   2) Calls / (homepage) and prints status
 */

const BASE_URL = process.env.BASE_URL;

if (!BASE_URL) {
  console.error('✗ BASE_URL is not set.');
  console.error('  Set BASE_URL to your deployed Worker URL, e.g.:');
  console.error('  BASE_URL="https://scanner-safe-links.<account>.workers.dev" npm run deploy:verify');
  process.exit(1);
}

async function main() {
  console.log(`Using BASE_URL = ${BASE_URL}\n`);

  // 1) /admin/ping
  const pingUrl = `${BASE_URL.replace(/\/+$/, '')}/admin/ping`;
  console.log(`=== Checking ${pingUrl} ===`);
  try {
    const res = await fetch(pingUrl);
    const status = res.status;
    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch {
      bodyText = '';
    }

    console.log(`Status: ${status}`);
    if (bodyText) {
      try {
        const json = JSON.parse(bodyText);
        console.log('Body (JSON):', JSON.stringify(json, null, 2));
      } catch {
        console.log('Body (text):', bodyText);
      }
    }
    console.log('');
  } catch (err) {
    console.error('✗ Request to /admin/ping failed:', err.message || err);
    console.error('  Make sure your Worker is deployed and BASE_URL is correct.');
    process.exit(1);
  }

  // 2) /
  const homeUrl = `${BASE_URL.replace(/\/+$/, '')}/`;
  console.log(`=== Checking ${homeUrl} ===`);
  try {
    const res = await fetch(homeUrl);
    const status = res.status;
    let snippet = '';
    try {
      const text = await res.text();
      snippet = text.slice(0, 200).replace(/\s+/g, ' ');
    } catch {
      snippet = '';
    }

    console.log(`Status: ${status}`);
    if (snippet) {
      console.log('Body snippet:', snippet);
    }
  } catch (err) {
    console.error('✗ Request to / failed:', err.message || err);
    process.exit(1);
  }

  console.log('\n✓ deploy_verify completed. If both requests returned 2xx/3xx/5xx as expected, the Worker is reachable.');
}

main().catch((err) => {
  console.error('✗ deploy_verify encountered an error:', err.message || err);
  process.exit(1);
});

