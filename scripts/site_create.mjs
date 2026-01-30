#!/usr/bin/env node

/**
 * Create (or upsert) a site for local development
 * Reads ADMIN_API_KEY from .dev.vars and sends POST to /admin/sites
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const HOSTNAME = process.env.HOSTNAME || 'customer.local';
const ORIGIN_BASE_URL = process.env.ORIGIN_BASE_URL || 'http://127.0.0.1:8787';

// Default allowlists for local dev
const DEFAULT_PATH_ALLOWLIST = ['/auth', '/demo'];
const DEFAULT_QUERY_ALLOWLIST = ['token', 'type', 'redirect_to', 'next', 'state'];

/**
 * Read ADMIN_API_KEY from .dev.vars file
 */
function readAdminApiKey() {
  try {
    const devVarsPath = join(process.cwd(), '.dev.vars');
    const content = readFileSync(devVarsPath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('ADMIN_API_KEY=')) {
        const key = trimmed.substring('ADMIN_API_KEY='.length).trim();
        if (key) {
          return key;
        }
      }
    }
    
    throw new Error('ADMIN_API_KEY not found in .dev.vars');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('.dev.vars file not found. Run: npm run setup:dev');
    }
    throw err;
  }
}

async function main() {
  console.log('Creating site for local development...\n');
  
  // Read ADMIN_API_KEY
  let adminApiKey;
  try {
    adminApiKey = readAdminApiKey();
  } catch (err) {
    console.error(`✗ Error reading .dev.vars: ${err.message}`);
    process.exit(1);
  }
  
  // Prepare request body
  const body = {
    hostname: HOSTNAME,
    originBaseUrl: ORIGIN_BASE_URL,
    pathAllowlist: DEFAULT_PATH_ALLOWLIST,
    queryAllowlist: DEFAULT_QUERY_ALLOWLIST,
  };
  
  console.log('Request body:');
  console.log(JSON.stringify(body, null, 2));
  console.log('');
  
  // Send POST request
  try {
    const response = await fetch(`${BASE_URL}/admin/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      // Try to parse error response
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        // Ignore
      }
      
      if (response.status === 0 || response.status >= 500) {
        console.error(`✗ Server error (${response.status}). Is the worker running?`);
        console.error('  → Start the server first: npm run dev');
        process.exit(1);
      }
      
      // Handle 409 (site already exists)
      if (response.status === 409) {
        try {
          const errorJson = JSON.parse(errorBody);
          console.log('ℹ️  Site already exists for this hostname.');
          console.log(`   ${errorJson.error || 'Site with this hostname already exists'}`);
          console.log('\n  To view existing sites, run:');
          console.log('    npm run test:admin-list');
          console.log('\n  To update the site, use PATCH /admin/sites/:siteId');
          process.exit(0);
        } catch (e) {
          // Fall through to generic error handling
        }
      }
      
      console.error(`✗ Request failed with status ${response.status}`);
      if (errorBody) {
        try {
          const errorJson = JSON.parse(errorBody);
          console.error(`  Error: ${errorJson.error || errorBody}`);
        } catch (e) {
          console.error(`  Response: ${errorBody}`);
        }
      }
      process.exit(1);
    }
    
    // Parse and print success response
    const result = await response.json();
    
    console.log('✓ Site created successfully!\n');
    console.log('Site details:');
    console.log(JSON.stringify(result, null, 2));
    
    // Extract SAT if present (only shown once on creation)
    if (result.sat) {
      console.log('\n⚠️  IMPORTANT: Save this Site Access Token (SAT) - it will not be shown again:');
      console.log(`   ${result.sat}`);
      console.log('\n  Use it to:');
      console.log('  - Log in to dashboard: http://127.0.0.1:8787/app');
      console.log('  - Authenticate receipts API: Authorization: Bearer <SAT>');
    }
    
    console.log(`\n✓ Site ready! Test it:`);
    console.log(`  http://127.0.0.1:8787/l/demo/consume?token=hello123`);
    console.log(`  (Set Host header to: ${HOSTNAME})`);
    
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message.includes('fetch failed')) {
      console.error('✗ Cannot connect to worker server.');
      console.error('  → Start the server first: npm run dev');
      process.exit(1);
    }
    
    console.error(`✗ Unexpected error: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
