#!/usr/bin/env node

/**
 * site_update_prod.mjs
 *
 * Update an existing Site on a deployed Worker (workers.dev) by hostname.
 *
 * Required env:
 *   - BASE_URL         e.g. https://scanner-safe-links.marcus-liljequist.workers.dev
 *   - ADMIN_API_KEY    admin key for /admin/*
 *   - HOSTNAME         site hostname to update
 *   - ORIGIN_BASE_URL  new origin base URL (http or https)
 *
 * Optional env:
 *   - ORIGIN_BASE_URL
 *   - PATH_ALLOWLIST   (comma-separated)
 *   - QUERY_ALLOWLIST  (comma-separated)
 *   - TURNSTILE_ENABLED
 *   - TURNSTILE_SITE_KEY
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

function parseListEnv(name) {
  const raw = process.env[name];
  if (!raw) {
    return null;
  }
  if (!raw.trim()) {
    return null;
  }

  const parts = raw.split(',');
  const result = [];

  for (let i = 0; i < parts.length; i++) {
    const trimmed = parts[i].trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }

  return result;
}

async function main() {
  const BASE_URL = getEnvRequired('BASE_URL', 'https://scanner-safe-links.marcus-liljequist.workers.dev');
  const ADMIN_API_KEY = getEnvRequired('ADMIN_API_KEY', 'your-admin-key');
  const HOSTNAME = getEnvRequired('HOSTNAME', 'scanner-safe-links.marcus-liljequist.workers.dev');
  const ORIGIN_BASE_URL = getEnvRequired('ORIGIN_BASE_URL', 'https://httpbin.org');

  const base = BASE_URL.replace(/\/+$/, '');

  console.log('Updating site configuration for hostname: ' + HOSTNAME);
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
    console.error('Failed to parse site JSON: ' + textSite);
    process.exit(1);
  }

  const siteId = site.siteId;

  const body = {
    originBaseUrl: ORIGIN_BASE_URL,
  };

  const pathList = parseListEnv('PATH_ALLOWLIST');
  if (pathList) {
    body.pathAllowlist = pathList;
  }

  const queryList = parseListEnv('QUERY_ALLOWLIST');
  if (queryList) {
    body.queryAllowlist = queryList;
  }

  if (process.env.TURNSTILE_ENABLED && process.env.TURNSTILE_ENABLED.trim()) {
    const envValue = process.env.TURNSTILE_ENABLED.trim().toLowerCase();
    body.turnstileEnabled = envValue === 'true' || envValue === '1';
  }

  if (process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SITE_KEY.trim()) {
    body.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY.trim();
  }

  const updateUrl = base + '/admin/sites/' + encodeURIComponent(siteId);

  const updateRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + ADMIN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const updatedText = await updateRes.text();

  if (updateRes.status === 401) {
    console.error('ERROR: ADMIN_API_KEY missing or incorrect.');
    console.error('Verify your ADMIN_API_KEY is set correctly.');
    process.exit(1);
  }

  if (!updateRes.ok) {
    console.error('ERROR: Update failed with status ' + updateRes.status);
    console.error('Response: ' + updatedText);
    process.exit(1);
  }

  let updatedSite;
  try {
    updatedSite = JSON.parse(updatedText);
  } catch (e) {
    console.log('Response: ' + updatedText);
    updatedSite = null;
  }

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
    console.error('Failed to parse rotate response: ' + rotatedText);
    process.exit(1);
  }

  const sat = rotated.sat;

  console.log('Site updated successfully!');
  console.log('');
  if (updatedSite) {
    console.log('Updated configuration:');
    console.log(JSON.stringify(updatedSite, null, 2));
    console.log('');
  }
  console.log('IMPORTANT: Save this new Site Access Token (SAT):');
  console.log(sat);
  console.log('');
  console.log('This SAT is only shown once. Use it to access the dashboard at /app');
}

main().catch((err) => {
  let message = '';
  if (err && typeof err.message === 'string') {
    message = err.message;
  } else {
    message = String(err);
  }
  console.error('site_update_prod failed: ' + message);
  process.exit(1);
});
