#!/usr/bin/env node

/**
 * site_rotate_sat_prod.mjs
 *
 * Rotate (generate new) Site Access Token for an existing site on a deployed Worker.
 *
 * Required env:
 *   - BASE_URL         e.g. https://scanner-safe-links.marcus-liljequist.workers.dev
 *   - ADMIN_API_KEY    admin key for /admin/*
 *   - HOSTNAME         site hostname to rotate SAT for
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

  console.log('Rotating Site Access Token (SAT) for hostname: ' + HOSTNAME);
  console.log('Worker URL: ' + base);
  console.log('');

  // First, get the site to find siteId
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

  const siteId = site.siteId;

  // Rotate SAT
  const rotateRes = await fetch(base + '/admin/sites/' + encodeURIComponent(siteId) + '/rotate-sat', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + ADMIN_API_KEY,
    },
  });

  if (rotateRes.status === 401) {
    console.error('ERROR: ADMIN_API_KEY missing or incorrect.');
    console.error('Verify your ADMIN_API_KEY is set correctly.');
    process.exit(1);
  }

  if (!rotateRes.ok) {
    const txt = await rotateRes.text();
    console.error('ERROR: POST /admin/sites/' + siteId + '/rotate-sat failed: ' + rotateRes.status);
    console.error('Response: ' + txt);
    process.exit(1);
  }

  const rotatedText = await rotateRes.text();
  let rotated;
  try {
    rotated = JSON.parse(rotatedText);
  } catch (e) {
    console.error('ERROR: Failed to parse rotate response: ' + rotatedText);
    process.exit(1);
  }

  const sat = rotated.sat;

  console.log('SAT rotated successfully!');
  console.log('');
  console.log('IMPORTANT: Save this new Site Access Token (SAT):');
  console.log(sat);
  console.log('');
  console.log('This SAT is only shown once. Use it to access the dashboard at /app');
  console.log('Previous SATs are now invalid.');
}

main().catch((err) => {
  let message = '';
  if (err && typeof err.message === 'string') {
    message = err.message;
  } else {
    message = String(err);
  }
  console.error('ERROR: site_rotate_sat_prod failed: ' + message);
  process.exit(1);
});
