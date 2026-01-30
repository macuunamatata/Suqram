#!/usr/bin/env node

/**
 * Receipts API test: Export events using SAT header auth
 * Requires SAT environment variable (Site Access Token)
 */

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const SAT = process.env.SAT;

if (!SAT) {
  console.error('✗ Error: SAT (Site Access Token) environment variable is required');
  console.error('Usage: SAT=your_token node scripts/receipts_export.mjs');
  process.exit(1);
}

async function main() {
  const url = new URL(`${BASE_URL}/r/export.json`);
  
  // Add optional filters
  const limit = process.env.LIMIT || '200';
  const type = process.env.TYPE || '';
  const since = process.env.SINCE || '';
  
  if (limit) url.searchParams.set('limit', limit);
  if (type) url.searchParams.set('type', type);
  if (since) url.searchParams.set('since', since);
  
  console.log(`Exporting receipts from ${url.toString()}\n`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SAT}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`✗ Failed with status ${response.status}`);
    console.error(`Response: ${errorText}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log('✓ Success');
  console.log(`\nExported ${data.events?.length || 0} event(s)\n`);
  
  if (data.events && data.events.length > 0) {
    console.log('First 5 events:');
    data.events.slice(0, 5).forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.action} - ${new Date(event.timestamp).toLocaleString()}`);
      console.log(`   Nonce: ${event.nonce}`);
      console.log(`   Site: ${event.hostname || event.siteId || 'N/A'}`);
      if (event.note) console.log(`   Note: ${event.note}`);
    });
    
    if (data.events.length > 5) {
      console.log(`\n... and ${data.events.length - 5} more events`);
    }
  } else {
    console.log('No events found.');
  }
  
  // Optionally write to file
  if (process.env.OUTPUT) {
    const fs = await import('fs/promises');
    await fs.writeFile(process.env.OUTPUT, JSON.stringify(data, null, 2));
    console.log(`\n✓ Written to ${process.env.OUTPUT}`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
