#!/usr/bin/env node

/**
 * Admin API test: List all sites
 * Requires ADMIN_API_KEY environment variable
 */

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'kuk';

async function main() {
  console.log(`Listing sites at ${BASE_URL}/admin/sites\n`);

  const response = await fetch(`${BASE_URL}/admin/sites`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
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
  console.log(`\nFound ${data.sites?.length || 0} site(s):\n`);
  
  if (data.sites && data.sites.length > 0) {
    data.sites.forEach((site, index) => {
      console.log(`${index + 1}. Site ID: ${site.siteId}`);
      console.log(`   Hostname: ${site.hostname}`);
      console.log(`   Origin: ${site.originBaseUrl}`);
      console.log('');
    });
  } else {
    console.log('No sites found.');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
