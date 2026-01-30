#!/usr/bin/env node

/**
 * Redeem demo link without a browser (Phase B)
 *
 * Flow:
 *  1) GET /l/demo/consume?token=hello123
 *     - Use Host header only for local dev (127.0.0.1 / localhost)
 *  2) Parse continuity cookie, nonce, and proofSeed from HTML
 *  3) Compute signature = sha256hex(sessionId + ":" + nonce + ":" + proofSeed)
 *  4) POST /v/:nonce with signature + proofSeed and Cookie: continuity=...
 *  5) Print POST status, Location header, and any JSON error body
 *
 * Works with:
 *  - Local dev BASE_URL like http://127.0.0.1:8787
 *  - Deployed BASE_URL like https://scanner-safe-links.<user>.workers.dev
 */

import { createHash } from 'node:crypto';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';
const HOSTNAME = process.env.HOSTNAME || 'customer.local';

function isLocalHost(url) {
  const host = url.hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

function extractCookie(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const v of values) {
    const m = v.match(new RegExp(`^${name}=([^;]+)`));
    if (m) return m[1];
  }
  return null;
}

function sha256hexNode(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

async function main() {
  console.log(`Redeeming demo link`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Hostname (for local dev): ${HOSTNAME}`);
  console.log('');

  let urlObj;
  try {
    urlObj = new URL(BASE_URL);
  } catch (err) {
    console.error('BASE_URL must be a valid URL, e.g. http://127.0.0.1:8787 or https://scanner-safe-links....workers.dev');
    process.exit(1);
  }

  const base = BASE_URL.replace(/\/+$/, '');
  const getUrl = `${base}/l/demo/consume?token=hello123`;
  const headers = { 'User-Agent': 'redeem_demo.mjs' };

  const local = isLocalHost(urlObj);
  if (local) {
    headers['Host'] = HOSTNAME;
  }

  console.log('=== Step 1: GET /l/demo/consume?token=hello123 ===');
  let getRes;
  try {
    getRes = await fetch(getUrl, { method: 'GET', headers });
  } catch (err) {
    console.error('✗ Failed to reach worker:', err.message);
    console.error('  → Start the server first: npm run dev (for local dev)');
    process.exit(1);
  }

  if (getRes.status !== 200) {
    const bodyText = await getRes.text().catch(() => '');
    console.error(`✗ GET /l/demo/consume failed with status ${getRes.status}`);
    if (bodyText) {
      console.error('  Body (first 200 chars):', bodyText.slice(0, 200).replace(/\s+/g, ' '));
    }
    process.exit(1);
  }
  console.log('✓ GET returned 200');

  const setCookie = getRes.headers.get('set-cookie');
  const continuity = extractCookie(setCookie, 'continuity');
  if (!continuity) {
    console.error('✗ Missing continuity cookie (Set-Cookie with continuity=...)');
    process.exit(1);
  }
  console.log(`✓ continuity cookie: ${continuity.substring(0, 20)}...\n`);

  const html = await getRes.text();

  let nonce = null;
  let match = html.match(/action="\/v\/([^"]+)"/);
  if (match) {
    nonce = match[1].trim();
  } else {
    match = html.match(/data-nonce="([^"]+)"/);
    if (match) {
      nonce = match[1].trim();
    }
  }

  if (!nonce) {
    console.error('✗ Could not extract nonce from HTML (action="/v/<nonce>" or data-nonce)');
    process.exit(1);
  }

  let proofSeed = null;
  match = html.match(/name="proofSeed"\s+value="([^"]+)"/);
  if (match) {
    proofSeed = match[1].trim();
  } else {
    match = html.match(/data-seed="([^"]+)"/);
    if (match) {
      proofSeed = match[1].trim();
    }
  }

  if (!proofSeed) {
    console.error('✗ Could not extract proofSeed from HTML');
    process.exit(1);
  }

  console.log(`✓ nonce: ${nonce}`);
  console.log(`✓ proofSeed: ${proofSeed.substring(0, 20)}...\n`);

  const sigData = `${continuity}:${nonce}:${proofSeed}`;
  const sig = sha256hexNode(sigData);
  console.log('=== Step 2: Compute signature ===');
  console.log(`Signature (sha256hex(sessionId:nonce:proofSeed)):\n  ${sig}\n`);

  console.log('=== Step 3: POST /v/:nonce ===');
  const postUrl = `${base}/v/${encodeURIComponent(nonce)}`;
  const formBody = `signature=${encodeURIComponent(sig)}&proofSeed=${encodeURIComponent(proofSeed)}`;

  const postHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Cookie: `continuity=${continuity}`,
  };
  if (local) {
    postHeaders['Host'] = HOSTNAME;
  }

  let postRes;
  try {
    postRes = await fetch(postUrl, {
      method: 'POST',
      headers: postHeaders,
      body: formBody,
      redirect: 'manual',
    });
  } catch (err) {
    console.error('✗ Failed to POST to /v/:nonce:', err.message);
    process.exit(1);
  }

  const location = postRes.headers.get('location');
  console.log(`Status: ${postRes.status}`);
  console.log(`Location: ${location || '(none)'}`);

  if (postRes.status !== 302 && postRes.status !== 303) {
    const bodyText = await postRes.text().catch(() => '');
    if (bodyText) {
      try {
        const json = JSON.parse(bodyText);
        console.log('Error JSON:', JSON.stringify(json, null, 2));
      } catch {
        console.log('Response body:', bodyText);
      }
    }
    process.exit(1);
  }

  console.log('\n✓ Redemption succeeded (302 redirect).');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
