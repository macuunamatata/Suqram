#!/usr/bin/env node

/**
 * Smoke test for httpbin.org integration
 * Tests redemption flow with /l/anything?token=hello123 -> redirects to https://httpbin.org/anything
 *
 * Usage:
 *   BASE_URL=https://scanner-safe-links.marcus-liljequist.workers.dev node scripts/redeem_demo_https.mjs
 */

import { createHash } from 'node:crypto';

const BASE_URL = process.env.BASE_URL || 'https://scanner-safe-links.marcus-liljequist.workers.dev';
const TEST_PATH = 'anything';
const TEST_QUERY = 'token=hello123';

function sha256hexNode(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

async function main() {
  console.log(`Testing httpbin.org integration`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test path: /l/${TEST_PATH}?${TEST_QUERY}`);
  console.log('');

  // Step 1: GET /l/anything?token=hello123
  console.log('=== Step 1: GET /l/anything?token=hello123 ===');
  const getResponse = await fetch(`${BASE_URL}/l/${TEST_PATH}?${TEST_QUERY}`);
  
  if (!getResponse.ok) {
    console.error(`✗ GET failed with status ${getResponse.status}`);
    const text = await getResponse.text();
    console.error(`Response: ${text.substring(0, 200)}`);
    process.exit(1);
  }
  console.log(`✓ GET returned ${getResponse.status}`);

  // Step 2: Extract session cookie
  const setCookieHeader = getResponse.headers.get('Set-Cookie');
  if (!setCookieHeader) {
    console.error('✗ No Set-Cookie header found');
    process.exit(1);
  }
  
  const cookieMatch = setCookieHeader.match(/continuity=([^;]+)/);
  if (!cookieMatch) {
    console.error('✗ Could not extract continuity cookie');
    process.exit(1);
  }
  const sessionId = cookieMatch[1];
  console.log(`✓ Extracted session cookie: ${sessionId.substring(0, 20)}...`);

  // Step 3: Parse HTML to extract nonce and proofSeed
  const html = await getResponse.text();
  
  // Extract nonce from data-nonce attribute or form action
  let nonce = null;
  const nonceDataMatch = html.match(/data-nonce="([^"]+)"/);
  if (nonceDataMatch) {
    nonce = nonceDataMatch[1].trim();
  } else {
    // Fallback: try form action
    const nonceActionMatch = html.match(/action="\/v\/([^"]+)"/);
    if (nonceActionMatch) {
      nonce = nonceActionMatch[1].trim();
    }
  }
  
  if (!nonce) {
    console.error('✗ Could not extract nonce from HTML');
    process.exit(1);
  }
  console.log(`✓ Extracted nonce: ${nonce}`);

  // Extract proofSeed from data-seed attribute
  let proofSeed = null;
  const seedDataMatch = html.match(/data-seed="([^"]+)"/);
  if (seedDataMatch) {
    proofSeed = seedDataMatch[1].trim();
  } else {
    // Fallback: try hidden input
    const seedInputMatch = html.match(/name="proofSeed"\s+value="([^"]+)"/);
    if (seedInputMatch) {
      proofSeed = seedInputMatch[1].trim();
    }
  }
  
  if (!proofSeed) {
    console.error('✗ Could not extract proofSeed from HTML');
    process.exit(1);
  }
  console.log(`✓ Extracted proofSeed: ${proofSeed.substring(0, 20)}...`);

  // Step 4: Compute signature: sha256hex(sessionId + ":" + nonce + ":" + proofSeed)
  const sigData = `${sessionId}:${nonce}:${proofSeed}`;
  const sig = sha256hexNode(sigData);
  console.log(`✓ Computed signature: ${sig.substring(0, 16)}...`);

  // Step 5: POST /v/:nonce
  console.log('\n=== Step 2: POST /v/:nonce ===');
  const params = new URLSearchParams();
  params.set('signature', sig);
  params.set('proofSeed', proofSeed);

  const postResponse = await fetch(`${BASE_URL}/v/${nonce}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `continuity=${sessionId}`,
    },
    redirect: 'manual',
    body: params.toString(),
  });

  console.log(`✓ POST returned status ${postResponse.status}`);

  // Step 6: Assert 303 and Location begins with https://httpbin.org/anything
  if (postResponse.status !== 303 && postResponse.status !== 302) {
    console.error(`✗ Expected 302 or 303, got ${postResponse.status}`);
    const text = await postResponse.text();
    console.error(`Response body: ${text.substring(0, 200)}`);
    process.exit(1);
  }

  const location = postResponse.headers.get('Location');
  if (!location) {
    console.error('✗ No Location header in redirect response');
    process.exit(1);
  }

  console.log(`✓ Location header: ${location}`);

  if (!location.startsWith('https://httpbin.org/anything')) {
    console.error(`✗ Location should start with https://httpbin.org/anything, got: ${location}`);
    process.exit(1);
  }

  console.log('\n✓ Test passed: POST returns 303 with Location pointing to httpbin.org/anything');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
