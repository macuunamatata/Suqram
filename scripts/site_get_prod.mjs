#!/usr/bin/env node

/**
 * site_get_prod.mjs
 *
 * Get site configuration by hostname from a deployed Worker.
 *
 * Required env:
 *   - BASE_URL         e.g. https://scanner-safe-links.marcus-liljequist.workers.dev
 *   - ADMIN_API_KEY    admin key for /admin/*
 *   - HOSTNAME         site hostname to get
 */

function getEnvRequired(name, example) {
  const value = process.env[name];
  let missing = false;

  if (!value) {
    missing = true;
  } else if (!value.trim()) {
    missing = true;
  }

  if (missing) {
    console.error('ERROR: ' + name + ' is required. Example: ' + example);
    console.error('Set ' + name + ' first (PowerShell: $env:' + name + "='value')");
    process.exit(1);
  }

  return value.trim();
}

async function main() {
  const BASE_URL = getEnvRequired('BASE_URL', 'https://scanner-safe-links.marcus-liljequist.workers.dev');
  const ADMIN_API_KEY = getEnvRequired('ADMIN_API_KEY', 'your-admin-key');
  const HOSTNAME = getEnvRequired('HOSTNAME', 'links.mycompany.com');

  const base = BASE_URL.replace(/\/+$/, '');

  console.log('Getting site configuration for hostname: ' + HOSTNAME);
  console.log('Worker URL: ' + base);
  console.log('');

  const getRes = await fetch(base + '/admin/sites/by-hostname/' + encodeURIComponent(HOSTNAME), {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + ADMIN_API_KEY,
    },
  });

  if (getRes.status === 401) {
    console.error('ERROR: ADMIN_API_KEY missing or incorrect.');
    console.error('Verify your ADMIN_API_KEY is set correctly.');
    process.exit(1);
  }

  if (getRes.status === 404) {
    console.error('ERROR: Site not found for hostname: ' + HOSTNAME);
    console.error('Run: npm run site:create:prod');
    process.exit(1);
  }

  if (!getRes.ok) {
    const txt = await getRes.text();
    console.error('ERROR: GET /admin/sites/by-hostname/' + HOSTNAME + ' failed: ' + getRes.status);
    console.error('Response: ' + txt);
    process.exit(1);
  }

  const textSite = await getRes.text();
  let site;
  try {
    site = JSON.parse(textSite);
  } catch (e) {
    console.error('ERROR: Failed to parse site JSON: ' + textSite);
    process.exit(1);
  }

  console.log('Site configuration:');
  console.log(JSON.stringify(site, null, 2));
  console.log('');
  console.log('Note: SAT (Site Access Token) is not returned for security. Use site:rotate-sat:prod to get a new SAT.');
}

main().catch((err) => {
  let message = '';
  if (err && typeof err.message === 'string') {
    message = err.message;
  } else {
    message = String(err);
  }
  console.error('ERROR: site_get_prod failed: ' + message);
  process.exit(1);
});
