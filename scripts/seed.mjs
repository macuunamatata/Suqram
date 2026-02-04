#!/usr/bin/env node
// EIG V1 Seed Utility
// Seeds D1 with tenant, domain, link, and recipe enablements
// Also seeds TenantConfigDO (source of truth for hostname->tenant mapping)

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Worker config is in worker/wrangler.worker.toml (repo root)
const wranglerConfigPath = resolve(__dirname, '..', 'worker', 'wrangler.toml');
const quotedConfig = `"${wranglerConfigPath}"`;

const args = process.argv.slice(2);
const isRemote = args.includes('--remote');

// Detect D1 binding with precedence: CLI arg > env var > auto-detect > fallback
function detectD1Binding() {
  // 1. Check CLI arg: --db-binding=<binding>
  const cliArg = args.find(a => a.startsWith('--db-binding='));
  if (cliArg) {
    return cliArg.split('=')[1];
  }
  
  // 2. Check env var: D1_BINDING
  if (process.env.D1_BINDING) {
    return process.env.D1_BINDING;
  }
  
  // 3. Auto-detect from worker/wrangler.worker.toml
  try {
    const wranglerPath = resolve(__dirname, '..', 'worker', 'wrangler.toml');
    const content = readFileSync(wranglerPath, 'utf-8');
    
    // Find first [[d1_databases]] section and extract binding
    const d1SectionMatch = content.match(/\[\[d1_databases\]\][\s\S]*?binding\s*=\s*"([^"]+)"/);
    if (d1SectionMatch && d1SectionMatch[1]) {
      return d1SectionMatch[1];
    }
  } catch (error) {
    // If file doesn't exist or can't be read, continue to fallback
  }
  
  // 4. Fallback
  return 'EIG_DB';
}

const dbBinding = detectD1Binding();

// Detect tracking host with precedence: CLI arg > env var > default
function detectTrackingHost() {
  // 1. Check CLI arg: --host=<host>
  const cliArg = args.find(a => a.startsWith('--host='));
  if (cliArg) {
    return cliArg.split('=')[1];
  }
  
  // 2. Check env var: EIG_HOST
  if (process.env.EIG_HOST) {
    return process.env.EIG_HOST;
  }
  
  // 3. Default
  return 'go.localtest.me';
}

const TRACKING_HOST = detectTrackingHost();

// Parse arguments
const tenantId = args.find(a => a.startsWith('--tenant='))?.split('=')[1] || `tenant-${Date.now()}`;
// Use --hostname for backward compatibility, but prefer --host
const hostnameArg = args.find(a => a.startsWith('--hostname='));
const hostname = hostnameArg ? hostnameArg.split('=')[1] : TRACKING_HOST;
const token = args.find(a => a.startsWith('--token='))?.split('=')[1] || `token-${Date.now()}`;
const destination = args.find(a => a.startsWith('--destination='))?.split('=')[1] || 'https://example.com/success';
const tenantName = args.find(a => a.startsWith('--name='))?.split('=')[1] || 'Test Tenant';

function log(message) {
  console.log(`[seed] ${message}`);
}

import { writeFileSync, unlinkSync } from 'fs';

function executeSQL(sql, description) {
  log(description);
  
  const tempFile = join(__dirname, '..', '.temp-seed.sql');
  // Windows-safe: quote the file path
  const quotedFile = `"${tempFile}"`;
  
  try {
    writeFileSync(tempFile, sql);
    if (isRemote) {
      // Remote: use wrangler d1 execute
      execSync(`wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedFile} --remote`, { stdio: 'inherit' });
    } else {
      // Local: use wrangler d1 execute --local
      execSync(`wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedFile} --local`, { stdio: 'inherit' });
    }
    unlinkSync(tempFile);
  } catch (error) {
    log(`Error: ${error.message}`);
    try { unlinkSync(tempFile); } catch {}
    process.exit(1);
  }
}

async function ensureSchema() {
  log('Ensuring schema is applied...');
  const schemaPath = join(__dirname, '..', 'sql', 'schema.sql');
  // Windows-safe: quote the file path
  const quotedSchema = `"${schemaPath}"`;
  
  if (isRemote) {
    execSync(`wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedSchema} --remote`, { stdio: 'inherit' });
  } else {
    execSync(`wrangler --config ${quotedConfig} d1 execute ${dbBinding} --file=${quotedSchema} --local`, { stdio: 'inherit' });
  }
  log('Schema applied');
}

async function seedData() {
  const now = Date.now();
  const domainId = `domain-${Date.now()}`;
  const linkId = `link-${Date.now()}`;
  
  // Normalize hostname
  const normalizedHostname = hostname.toLowerCase().trim().replace(/\.$/, '');
  
  // Seed D1 tables (tenants, links, recipe_enablements)
  const sql = `
-- Seed tenant
INSERT OR IGNORE INTO tenants (tenant_id, name, created_at, updated_at)
VALUES ('${tenantId}', '${tenantName.replace(/'/g, "''")}', ${now}, ${now});

-- Seed domain (kept for backward compatibility, but TenantConfigDO is source of truth)
INSERT OR IGNORE INTO domains (domain_id, tenant_id, hostname, policy_template, created_at)
VALUES ('${domainId}', '${tenantId}', '${normalizedHostname}', 'low_friction', ${now});

-- Seed link
INSERT OR IGNORE INTO links (link_id, tenant_id, token, destination_url, created_at)
VALUES ('${linkId}', '${tenantId}', '${token}', '${destination.replace(/'/g, "''")}', ${now});

-- Seed recipe enablements (all disabled by default)
INSERT OR IGNORE INTO recipe_enablements (tenant_id, recipe_id, enabled, created_at, updated_at)
VALUES 
  ('${tenantId}', 'A', 0, ${now}, ${now}),
  ('${tenantId}', 'B', 0, ${now}, ${now}),
  ('${tenantId}', 'C', 0, ${now}, ${now});
`;

  executeSQL(sql, 'Seeding tenant, domain, link, and recipes...');
  
  // Seed TenantConfigDO (source of truth for hostname->tenant mapping)
  if (!isRemote) {
    // Only seed TenantConfigDO in local mode
    const seedUrl = process.env.WORKER_URL || 'http://127.0.0.1:8787';
    const adminKey = process.env.ADMIN_API_KEY || 'local-dev-key';
    
    try {
      log('Configuring hostname in TenantConfigDO...');
      const seedResponse = await fetch(`${seedUrl}/admin/seed-domain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostname: normalizedHostname,
          tenant_id: tenantId,
          policy_template: 'low_friction',
        }),
      });
      
      if (!seedResponse.ok) {
        const errorText = await seedResponse.text();
        log(`Warning: Failed to seed TenantConfigDO: ${errorText}`);
      } else {
        log('TenantConfigDO configured successfully');
      }
    } catch (error) {
      log(`Warning: Failed to call /admin/seed-domain: ${error.message}`);
    }
  }
  
  log(`\n✅ Seeded:`);
  log(`  Tenant ID: ${tenantId}`);
  log(`  Domain: ${normalizedHostname}`);
  log(`  Token: ${token}`);
  log(`  Destination: ${destination}`);
  log(`  Recipes: A=off, B=off, C=off`);
}

async function main() {
  console.log('🌱 EIG V1 Seed Utility\n');
  console.log(`Using D1 binding: ${dbBinding}`);
  console.log(`Mode: ${isRemote ? 'REMOTE (Cloudflare D1)' : 'LOCAL (Miniflare D1)'}`);
  console.log(`Seeding hostname: ${hostname}\n`);
  
  try {
    await ensureSchema();
    await seedData();
    
    console.log('\n✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

main();
