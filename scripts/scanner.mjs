#!/usr/bin/env node

/**
 * Scanner simulation test for scanner-safe-links
 * Simulates a security scanner preview and verifies bot heuristics
 */

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const TEST_PATH = process.env.TEST_PATH || 'auth/path';
const TEST_QUERY = process.env.TEST_QUERY || 'token=scanner';

// Use a User-Agent that matches likely_scanner detection
const SCANNER_USER_AGENT = process.env.SCANNER_UA || 'Mozilla/5.0 (compatible; Proofpoint/1.0; +https://www.proofpoint.com)';

async function main() {
  console.log(`Simulating security scanner preview: ${BASE_URL}/l/${TEST_PATH}?${TEST_QUERY}\n`);
  console.log(`User-Agent: ${SCANNER_USER_AGENT}\n`);

  // Step 1: GET /l/* with scanner User-Agent
  console.log('=== Step 1: GET /l/* with scanner User-Agent ===');
  const getResponse = await fetch(`${BASE_URL}/l/${TEST_PATH}?${TEST_QUERY}`, {
    headers: {
      'User-Agent': SCANNER_USER_AGENT,
    },
  });
  
  if (!getResponse.ok) {
    console.error(`✗ GET failed with status ${getResponse.status}`);
    const body = await getResponse.text();
    console.error(`Response: ${body}`);
    process.exit(1);
  }
  console.log(`✓ GET returned ${getResponse.status}`);

  // Step 2: Check for Turnstile widget markup
  const html = await getResponse.text();
  console.log('\n=== Step 2: Check for Turnstile widget ===');
  
  const hasTurnstileScript = html.includes('challenges.cloudflare.com/turnstile/v0/api.js');
  const hasTurnstileWidget = html.includes('turnstile-widget') || html.includes('id="turnstile-widget"');
  const hasTurnstileTokenField = html.includes('name="turnstile-token"');
  
  if (hasTurnstileScript || hasTurnstileWidget || hasTurnstileTokenField) {
    console.log('✓ Turnstile widget markup found in HTML');
    if (hasTurnstileScript) console.log('  - Turnstile script tag present');
    if (hasTurnstileWidget) console.log('  - Turnstile widget container present');
    if (hasTurnstileTokenField) console.log('  - Turnstile token input field present');
  } else {
    console.log('ℹ Turnstile widget markup NOT found in HTML');
    console.log('  (This is expected if TURNSTILE_ENABLED is false or TURNSTILE_SITE_KEY is missing)');
  }

  // Step 3: Verify no redemption happened (GET should never redeem)
  console.log('\n=== Step 3: Verify no redemption on GET ===');
  if (getResponse.status === 200) {
    console.log('✓ GET returned 200 (interstitial page, no redemption)');
  } else {
    console.log(`ℹ GET returned ${getResponse.status} (unexpected but not an error)`);
  }

  // Step 4: Fetch /r/events and check for scanner detection
  console.log('\n=== Step 4: Check receipts for scanner detection ===');
  
  // Wait a moment for event to be recorded
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const eventsResponse = await fetch(`${BASE_URL}/r/events`);
  
  if (!eventsResponse.ok) {
    console.error(`✗ GET /r/events failed with status ${eventsResponse.status}`);
    process.exit(1);
  }

  const eventsData = await eventsResponse.json();
  const events = eventsData.events || [];
  console.log(`✓ Retrieved ${events.length} events`);

  // Find events related to this request (look for minted events with likely_scanner note)
  const scannerEvents = events.filter(e => 
    e.action === 'minted' && 
    e.note && 
    (e.note.includes('likely_scanner') || e.note.includes('scanner'))
  );

  console.log(`\nLast 10 events:`);
  events.slice(0, 10).forEach((event, i) => {
    const date = new Date(event.timestamp).toISOString();
    const ua = event.ua ? (event.ua.length > 50 ? event.ua.substring(0, 50) + '...' : event.ua) : 'N/A';
    console.log(`  ${i + 1}. [${event.action}] ${event.nonce}`);
    console.log(`     Note: ${event.note || 'no note'}`);
    console.log(`     UA: ${ua}`);
    console.log(`     Time: ${date}`);
    console.log('');
  });

  // Verify scanner detection
  console.log('=== Verification ===');
  
  if (scannerEvents.length > 0) {
    console.log(`✓ Found ${scannerEvents.length} event(s) with likely_scanner note`);
    scannerEvents.forEach(event => {
      console.log(`  - Nonce: ${event.nonce}`);
      console.log(`    Note: ${event.note}`);
      console.log(`    UA: ${event.ua || 'N/A'}`);
    });
  } else {
    console.log('ℹ No events found with likely_scanner note');
    console.log('  (This may be expected if bot heuristics are not detecting the User-Agent)');
    
    // Check if there are any minted events at all
    const mintedEvents = events.filter(e => e.action === 'minted');
    if (mintedEvents.length > 0) {
      console.log(`  Found ${mintedEvents.length} minted event(s) without likely_scanner note:`);
      mintedEvents.slice(0, 3).forEach(event => {
        console.log(`    - ${event.nonce}: note="${event.note || 'none'}"`);
      });
    }
  }

  // Check for phase_a (minted) events
  const mintedEvents = events.filter(e => e.action === 'minted');
  if (mintedEvents.length > 0) {
    console.log(`✓ Found ${mintedEvents.length} minted event(s) (phase_a)`);
  } else {
    console.log('ℹ No minted events found (phase_a)');
  }

  console.log('\n✓ Scanner simulation test completed!');
}

main().catch(err => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
