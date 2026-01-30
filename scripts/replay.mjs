#!/usr/bin/env node

/**
 * Replay test for scanner-safe-links
 * Tests that nonces can only be redeemed once
 */

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const TEST_PATH = process.env.TEST_PATH || 'auth/replay';
const TEST_QUERY = process.env.TEST_QUERY || 'token=replay';

async function sha256hex(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  console.log(`Testing replay protection: ${BASE_URL}/l/${TEST_PATH}?${TEST_QUERY}\n`);

  // Step 1: GET /l/* to mint a nonce
  console.log('=== Step 1: Mint nonce ===');
  const getResponse = await fetch(`${BASE_URL}/l/${TEST_PATH}?${TEST_QUERY}`);
  
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

  // Step 2: First POST (should succeed)
  console.log('\n=== Step 2: First POST (should succeed) ===');
  const formData = new URLSearchParams();
  formData.append('signature', sig);
  formData.append('proofSeed', proofSeed);
  
  if (html.includes('name="turnstile-token"')) {
    formData.append('turnstile-token', '');
  }

  const firstPostResponse = await fetch(`${BASE_URL}/v/${nonce}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `continuity=${sessionId}`,
    },
    body: formData.toString(),
    redirect: 'manual',
  });

  if (firstPostResponse.status !== 302) {
    const body = await firstPostResponse.text();
    console.error(`✗ First POST returned ${firstPostResponse.status} instead of 302`);
    console.error(`Response: ${body}`);
    process.exit(1);
  }
  console.log(`✓ First POST succeeded (302)`);

  // Step 3: Immediate replay POST (should fail)
  console.log('\n=== Step 3: Replay POST (should fail) ===');
  const replayPostResponse = await fetch(`${BASE_URL}/v/${nonce}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `continuity=${sessionId}`,
    },
    body: formData.toString(),
  });

  if (replayPostResponse.status !== 409) {
    const body = await replayPostResponse.text();
    console.error(`✗ Replay POST returned ${replayPostResponse.status} instead of 409`);
    console.error(`Response: ${body}`);
    process.exit(1);
  }

  const replayBody = await replayPostResponse.json();
  console.log(`✓ Replay POST correctly denied (409 Conflict)`);
  console.log(`  Reason: ${replayBody.reason || 'unknown'}`);
  console.log(`  Error: ${replayBody.error || 'unknown'}`);

  // Step 4: Check receipts for replay event
  console.log('\n=== Step 4: Check receipts ===');
  const eventsResponse = await fetch(`${BASE_URL}/r/events`);
  const eventsData = await eventsResponse.json();
  const events = eventsData.events || [];

  // Look for events related to this nonce
  const nonceEvents = events.filter(e => e.nonce === nonce);
  console.log(`✓ Found ${nonceEvents.length} events for nonce ${nonce}`);
  
  const replayEvent = nonceEvents.find(e => 
    e.action === 'replay' || (e.note && (e.note.includes('Already redeemed') || e.note.includes('already_used')))
  );
  
  if (replayEvent) {
    console.log(`✓ Found replay event in receipts`);
    console.log(`  Action: ${replayEvent.action}`);
    console.log(`  Note: ${replayEvent.note}`);
    
    // Verify it's actually a "replay" action type
    if (replayEvent.action !== 'replay') {
      console.error(`✗ Expected action "replay" but got "${replayEvent.action}"`);
      process.exit(1);
    }
  } else {
    console.log(`ℹ Replay event not found in receipts (may be in different format)`);
  }

  console.log('\n✓ Replay test passed!');
}

main().catch(err => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
