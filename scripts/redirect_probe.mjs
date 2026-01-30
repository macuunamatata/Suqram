#!/usr/bin/env node

/**
 * redirect_probe.mjs
 *
 * No-browser redirect test.
 *
 * Required env:
 *   - BASE_URL   (e.g. http://127.0.0.1:8787 or https://scanner-safe-links....workers.dev)
 *   - HOSTNAME   (used as Host header when BASE_URL is local)
 *
 * Flow:
 *   1) GET ${BASE_URL}/l/anything/hello?token=abc
 *      - If BASE_URL host is localhost/127.0.0.1, send Host: HOSTNAME
 *   2) Parse continuity cookie, nonce, proofSeed from HTML
 *   3) Compute signature = sha256hex(sessionId + ":" + nonce + ":" + proofSeed)
 *   4) POST ${BASE_URL}/v/:nonce and print Status + Location
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
    console.error("Set " + name + " first (PowerShell: $env:" + name + "='value')");
    process.exit(1);
  }

  return value.trim();
}

async function sha256hex(data) {
  const encoder = new TextEncoder();
  const buf = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(hashBuffer);
  const parts = [];
  for (let i = 0; i < bytes.length; i++) {
    const hex = bytes[i].toString(16).padStart(2, '0');
    parts.push(hex);
  }
  return parts.join('');
}

function extractCookie(setCookieHeader, name) {
  if (!setCookieHeader) {
    return null;
  }

  const values = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const re = new RegExp('^' + name + '=([^;]+)');
    const match = v.match(re);
    if (match) {
      return match[1];
    }
  }

  return null;
}

async function main() {
  const BASE_URL = getEnvRequired('BASE_URL', 'http://127.0.0.1:8787');
  const HOSTNAME = getEnvRequired('HOSTNAME', 'links.mycompany.com');

  let target;
  try {
    target = new URL(BASE_URL);
  } catch (e) {
    console.error('BASE_URL must be a valid URL, e.g. http://127.0.0.1:8787 or https://scanner-safe-links...workers.dev');
    process.exit(1);
  }

  const base = BASE_URL.replace(/\/+$/, '');
  const path = '/l/anything/hello?token=abc';
  const getUrl = base + path;

  const isLocal =
    target.hostname === '127.0.0.1' ||
    target.hostname === 'localhost';

  const getHeaders = {};
  if (isLocal) {
    getHeaders.Host = HOSTNAME;
  }

  console.log('GET ' + getUrl);

  const getRes = await fetch(getUrl, {
    method: 'GET',
    headers: getHeaders,
  });

  console.log('GET status: ' + getRes.status);

  if (!getRes.ok) {
    const text = await getRes.text();
    console.error('GET failed: ' + getRes.status + ' ' + text);
    process.exit(1);
  }

  const setCookie = getRes.headers.get('set-cookie');
  const sessionId = extractCookie(setCookie, 'continuity');
  if (!sessionId) {
    console.error('Missing continuity cookie in response.');
    process.exit(1);
  }

  const html = await getRes.text();

  let nonce = null;
  let match = html.match(/data-nonce="([^"]+)"/);
  if (match) {
    nonce = match[1].trim();
  } else {
    match = html.match(/action="\/v\/([^"]+)"/);
    if (match) {
      nonce = match[1].trim();
    }
  }

  if (!nonce) {
    console.error('Could not extract nonce from HTML.');
    process.exit(1);
  }

  let proofSeed = null;
  match = html.match(/data-seed="([^"]+)"/);
  if (match) {
    proofSeed = match[1].trim();
  } else {
    match = html.match(/name="proofSeed"\s+value="([^"]+)"/);
    if (match) {
      proofSeed = match[1].trim();
    }
  }

  if (!proofSeed) {
    console.error('Could not extract proofSeed from HTML.');
    process.exit(1);
  }

  const sigData = sessionId + ':' + nonce + ':' + proofSeed;
  const signature = await sha256hex(sigData);

  const postUrl = base + '/v/' + encodeURIComponent(nonce);
  console.log('POST ' + postUrl);

  const formPieces = [];
  formPieces.push('signature=' + encodeURIComponent(signature));
  formPieces.push('proofSeed=' + encodeURIComponent(proofSeed));
  const body = formPieces.join('&');

  const postHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Cookie: 'continuity=' + sessionId,
  };
  if (isLocal) {
    postHeaders.Host = HOSTNAME;
  }

  const postRes = await fetch(postUrl, {
    method: 'POST',
    headers: postHeaders,
    body: body,
    redirect: 'manual',
  });

  const location = postRes.headers.get('location');
  console.log('POST status: ' + postRes.status);
  if (location) {
    console.log('Location: ' + location);
  } else {
    console.log('Location: (none)');
  }
}

main().catch((err) => {
  let message = '';
  if (err && typeof err.message === 'string') {
    message = err.message;
  } else {
    message = String(err);
  }
  console.error('redirect_probe failed: ' + message);
  process.exit(1);
});

