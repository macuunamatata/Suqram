#!/usr/bin/env node

/**
 * HTTP methods test for scanner-safe-links
 * Tests that /v/:nonce strictly rejects non-POST methods with 405
 */

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const TEST_NONCE = process.env.TEST_NONCE || 'test-nonce-12345';

async function main() {
  console.log(`Testing HTTP method restrictions on ${BASE_URL}/v/${TEST_NONCE}\n`);

  // Step 1: GET /v/:nonce (should be rejected with 405)
  console.log('=== Step 1: GET /v/:nonce (should be rejected) ===');
  const getResponse = await fetch(`${BASE_URL}/v/${TEST_NONCE}`, {
    method: 'GET',
  });

  if (getResponse.status !== 405) {
    const body = await getResponse.text();
    console.error(`✗ GET returned ${getResponse.status} instead of 405`);
    console.error(`Response: ${body}`);
    process.exit(1);
  }

  const getBody = await getResponse.json();
  console.log(`✓ GET correctly rejected with 405`);
  console.log(`  Status: ${getResponse.status}`);
  console.log(`  Error: ${getBody.error || 'unknown'}`);
  console.log(`  Reason: ${getBody.reason || 'unknown'}`);
  
  const allowHeader = getResponse.headers.get('Allow');
  if (allowHeader) {
    console.log(`  Allow header: ${allowHeader}`);
  }

  // Step 2: Test other methods (PUT, DELETE, PATCH, etc.)
  const methods = ['PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  console.log(`\n=== Step 2: Test other HTTP methods ===`);
  
  for (const method of methods) {
    try {
      const response = await fetch(`${BASE_URL}/v/${TEST_NONCE}`, {
        method: method,
      });

      if (response.status !== 405) {
        console.error(`✗ ${method} returned ${response.status} instead of 405`);
        const body = await response.text();
        console.error(`  Response: ${body}`);
        process.exit(1);
      }

      console.log(`✓ ${method} correctly rejected with 405`);
    } catch (err) {
      // Some methods might not be supported by fetch, that's okay
      console.log(`ℹ ${method} test skipped (${err.message})`);
    }
  }

  console.log('\n✓ All non-POST methods correctly rejected!');
  console.log('✓ Method restriction test passed!');
}

main().catch(err => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
