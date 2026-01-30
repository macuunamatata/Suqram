#!/usr/bin/env node

/**
 * Smoke test for fetch-based redemption with redirect handling
 * Tests: GET /l/* -> POST /v/:nonce (using fetch with redirect:manual) -> assert 302/303 with Location
 */

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const TEST_PATH = process.env.TEST_PATH || 'demo/consume';
const TEST_QUERY = process.env.TEST_QUERY || 'token=hello123';

async function sha256hex(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  console.log(`Testing fetch-based redemption: ${BASE_URL}/l/${TEST_PATH}?${TEST_QUERY}\n`);

  // Step 1: GET /l/demo/consume?token=hello123
  console.log('=== Step 1: GET /l/* ===');
  const getResponse = await fetch(`${BASE_URL}/l/${TEST_PATH}?${TEST_QUERY}`);
  
  if (!getResponse.ok) {
    console.error(`✗ GET failed with status ${getResponse.status}`);
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
  const sig = await sha256hex(sigData);
  console.log(`✓ Computed signature: ${sig.substring(0, 16)}...`);

  // Step 5: POST /v/:nonce using fetch with redirect:manual
  console.log('\n=== Step 2: POST /v/:nonce (fetch with redirect:manual) ===');
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

  // Step 6: Assert 302 or 303 and Location header exists
  if (postResponse.status !== 302 && postResponse.status !== 303) {
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
  console.log('\n✓ Test passed: fetch-based redemption returns 302/303 with Location header');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
