#!/usr/bin/env node

/**
 * Create (or rotate) a production site against a deployed Worker (workers.dev)
 *
 * Reads configuration from environment variables:
 *  - BASE_URL          (required) e.g. https://scanner-safe-links.<subdomain>.workers.dev
 *  - ADMIN_API_KEY     (required)
 *  - HOSTNAME          (required) e.g. links.mycompany.com
 *  - ORIGIN_BASE_URL   (required) e.g. https://app.mycompany.com
 *  - PATH_ALLOWLIST    optional, comma-separated (default: "/auth,/reset,/verify,/invite,/magic")
 *  - QUERY_ALLOWLIST   optional, comma-separated (default: "token,type,redirect_to,next,state")
 *  - TURNSTILE_ENABLED optional, default "false" ("true"/"1" to enable)
 *  - TURNSTILE_SITE_KEY optional, default "" (only needed if TURNSTILE_ENABLED is true)
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
    console.error(name + ' is required. Example: ' + example);
    process.exit(1);
  }

  return value.trim();
}

function parseListEnv(name, fallback) {
  const raw = process.env[name];
  let useFallback = false;

  if (!raw) {
    useFallback = true;
  } else if (!raw.trim()) {
    useFallback = true;
  }

  if (useFallback) {
    return fallback;
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
  const HOSTNAME = getEnvRequired('HOSTNAME', 'links.mycompany.com');
  const ORIGIN_BASE_URL = getEnvRequired('ORIGIN_BASE_URL', 'https://app.mycompany.com');
  const ADMIN_API_KEY = getEnvRequired('ADMIN_API_KEY', 'your-admin-key');

  const PATH_ALLOWLIST = parseListEnv('PATH_ALLOWLIST', ['/auth', '/reset', '/verify', '/invite', '/magic', '/demo']);
  const QUERY_ALLOWLIST = parseListEnv('QUERY_ALLOWLIST', ['token', 'type', 'redirect_to', 'next', 'state']);

  let turnstileEnabledEnv = 'false';
  if (typeof process.env.TURNSTILE_ENABLED === 'string') {
    turnstileEnabledEnv = process.env.TURNSTILE_ENABLED;
  }
  turnstileEnabledEnv = turnstileEnabledEnv.toLowerCase();

  let TURNSTILE_ENABLED = false;
  if (turnstileEnabledEnv === 'true') {
    TURNSTILE_ENABLED = true;
  } else if (turnstileEnabledEnv === '1') {
    TURNSTILE_ENABLED = true;
  }

  let TURNSTILE_SITE_KEY = '';
  if (typeof process.env.TURNSTILE_SITE_KEY === 'string') {
    TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY;
  }

  const base = BASE_URL.replace(/\/+$/, '');

  console.log('Creating or updating production site on deployed Worker...');
  console.log('');

  const desiredConfig = {
    hostname: HOSTNAME,
    originBaseUrl: ORIGIN_BASE_URL,
    pathAllowlist: PATH_ALLOWLIST,
    queryAllowlist: QUERY_ALLOWLIST,
    turnstileEnabled: TURNSTILE_ENABLED,
    turnstileSiteKey: TURNSTILE_SITE_KEY,
  };

  let sat;
  let siteId;
  let finalSite;

  const createRes = await fetch(base + '/admin/sites', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + ADMIN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(desiredConfig),
  });

  if (createRes.status === 200) {
    const json = await createRes.json();
    sat = json.sat;
    siteId = json.siteId;
    finalSite = json;
    console.log('Site created.');
  } else if (createRes.status === 409) {
    console.log('Site already exists. Fetching existing site and ensuring configuration is up to date...');

    const getRes = await fetch(base + '/admin/sites/by-hostname/' + encodeURIComponent(HOSTNAME), {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + ADMIN_API_KEY,
      },
    });

    if (!getRes.ok) {
      const txt = await getRes.text();
      console.error('GET /admin/sites/by-hostname/' + HOSTNAME + ' failed: ' + getRes.status + ' ' + txt);
      process.exit(1);
    }

    const existing = await getRes.json();
    siteId = existing.siteId;
    finalSite = existing;

    function arraysEqual(a, b) {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }

    let needsUpdate = false;

    if (existing.originBaseUrl !== ORIGIN_BASE_URL) {
      needsUpdate = true;
    }

    if (!arraysEqual(existing.pathAllowlist || [], PATH_ALLOWLIST)) {
      needsUpdate = true;
    }

    if (!arraysEqual(existing.queryAllowlist || [], QUERY_ALLOWLIST)) {
      needsUpdate = true;
    }

    if (typeof existing.turnstileEnabled === 'boolean') {
      if (existing.turnstileEnabled !== TURNSTILE_ENABLED) {
        needsUpdate = true;
      }
    }

    if (existing.turnstileSiteKey !== TURNSTILE_SITE_KEY) {
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log('Updating existing site configuration...');
      const updateBody = {
        originBaseUrl: ORIGIN_BASE_URL,
        pathAllowlist: PATH_ALLOWLIST,
        queryAllowlist: QUERY_ALLOWLIST,
        turnstileEnabled: TURNSTILE_ENABLED,
        turnstileSiteKey: TURNSTILE_SITE_KEY,
      };

      const updateRes = await fetch(base + '/admin/sites/' + encodeURIComponent(siteId), {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + ADMIN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateBody),
      });

      if (!updateRes.ok) {
        const txt = await updateRes.text();
        console.error('PUT /admin/sites/' + siteId + ' failed: ' + updateRes.status + ' ' + txt);
        process.exit(1);
      }

      finalSite = await updateRes.json();
    } else {
      console.log('Existing site configuration already matches desired values.');
    }

    const rotateRes = await fetch(base + '/admin/sites/' + encodeURIComponent(siteId) + '/rotate-sat', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + ADMIN_API_KEY,
      },
    });

    if (!rotateRes.ok) {
      const txt = await rotateRes.text();
      console.error('POST /admin/sites/' + siteId + '/rotate-sat failed: ' + rotateRes.status + ' ' + txt);
      process.exit(1);
    }

    const rotated = await rotateRes.json();
    sat = rotated.sat;
  } else {
    const txt = await createRes.text();
    console.error('Site create failed: ' + createRes.status + ' ' + txt);
    process.exit(1);
  }

  let missing = false;
  if (!sat) {
    missing = true;
  } else if (!siteId) {
    missing = true;
  } else if (!finalSite) {
    missing = true;
  }

  if (missing) {
    console.error('Missing SAT or siteId in response.');
    process.exit(1);
  }

  console.log('');
  console.log('Hostname: ' + HOSTNAME);
  console.log('Origin base URL: ' + (finalSite.originBaseUrl || ORIGIN_BASE_URL));
  console.log('Path allowlist: ' + JSON.stringify(finalSite.pathAllowlist || PATH_ALLOWLIST));
  console.log('Query allowlist: ' + JSON.stringify(finalSite.queryAllowlist || QUERY_ALLOWLIST));
  console.log('');

  console.log('Site ID: ' + siteId);
  console.log('');

  console.log('SAVE THIS Site Access Token (SAT):');
  console.log(sat);
  console.log('');

  const testUrl = 'https://' + HOSTNAME + '/l/demo/consume?token=hello123';
  console.log('Test URL (after DNS/route is set up):');
  console.log(testUrl);
  console.log('');
  console.log('Note: This will only work after the hostname is actually routed to the Worker in Cloudflare.');
}

main().catch((err) => {
  let message = '';
  if (err && typeof err.message === 'string') {
    message = err.message;
  } else {
    message = String(err);
  }
  console.error('site_create_prod failed: ' + message);
  process.exit(1);
});

