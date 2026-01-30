#!/usr/bin/env node

/**
 * Expired nonce test for scanner-safe-links
 * Tests that expired nonces cannot be redeemed
 */

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const TEST_PATH = process.env.TEST_PATH || 'auth/expired';
const TEST_QUERY = process.env.TEST_QUERY || 'token=expired';
const TTL_MS = parseInt(process.env.TTL_MS || '500', 10); // Default 500ms for testing

async function sha256hex(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Testing expired nonce: ${BASE_URL}/l/${TEST_PATH}?${TEST_QUERY}&__ttl_ms=${TTL_MS}\n`);

  // Step 1: GET /l/* with TTL override to mint a nonce with short TTL
  console.log(`=== Step 1: Mint nonce with ${TTL_MS}ms TTL ===`);
  const getResponse = await fetch(`${BASE_URL}/l/${TEST_PATH}?${TEST_QUERY}&__ttl_ms=${TTL_MS}`);
  
  if (!getResponse.ok) {
    console.error(`✗ GET failed with status ${getResponse.status}`);
    process.exit(1);
  }

  // Extract session cookie
  const setCookieHeader = getResponse.headers.get('Set-Cookie');
  const cookieMatch = setCookieHeader.match(/continuity=([^;]+)/);
  if (!cookieMatch) {
    console.error('✗ Could not extract continuity cookie');
    process.exit(1);
  }
  const sessionId = cookieMatch[1];
  console.log(`✓ Extracted session cookie`);

  // Parse HTML
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
    console.error('✗ Could not extract nonce');
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
    console.error('✗ Could not extract proofSeed');
    process.exit(1);
  }

  // Compute signature
  const sigData = `${sessionId}:${nonce}:${proofSeed}`;
  const sig = await sha256hex(sigData);
  console.log(`✓ Computed signature`);

  // Step 2: Wait for TTL to expire
  const waitTime = TTL_MS + 200; // Wait longer than TTL to ensure expiration
  console.log(`\n=== Step 2: Waiting ${waitTime}ms for TTL to expire ===`);
  await sleep(waitTime);
  console.log(`✓ Waited for expiration`);

  // Step 3: Attempt POST redemption (should fail with 410)
  console.log(`\n=== Step 3: Attempt POST redemption (should fail) ===`);
  const formData = new URLSearchParams();
  formData.append('signature', sig);
  formData.append('proofSeed', proofSeed);
  
  if (html.includes('name="turnstile-token"')) {
    formData.append('turnstile-token', '');
  }

  const postResponse = await fetch(`${BASE_URL}/v/${nonce}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `continuity=${sessionId}`,
    },
    body: formData.toString(),
    redirect: 'manual', // Don't follow redirects
  });

  if (postResponse.status !== 410) {
    const body = await postResponse.text();
    console.error(`✗ POST returned ${postResponse.status} instead of 410`);
    console.error(`Response: ${body}`);
    process.exit(1);
  }

  const errorBody = await postResponse.json();
  console.log(`✓ POST correctly rejected (410 expired)`);
  console.log(`  Reason: ${errorBody.reason || 'unknown'}`);
  console.log(`  Error: ${errorBody.error || 'unknown'}`);

  // Step 4: Check receipts
  console.log(`\n=== Step 4: Check receipts ===`);
  const eventsResponse = await fetch(`${BASE_URL}/r/events`);
  const eventsData = await eventsResponse.json();
  const events = eventsData.events || [];

  // Look for expired event
  const nonceEvents = events.filter(e => e.nonce === nonce);
  console.log(`✓ Found ${nonceEvents.length} events for nonce ${nonce}`);
  
  const expiredEvent = nonceEvents.find(e => 
    e.action === 'expired' || (e.note && e.note.includes('TTL expired'))
  );
  
  if (expiredEvent) {
    console.log(`✓ Found expired event in receipts`);
    console.log(`  Action: ${expiredEvent.action}`);
    console.log(`  Note: ${expiredEvent.note || 'no note'}`);
  }

  console.log('\n✓ Expired test passed!');
}

main().catch(err => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
