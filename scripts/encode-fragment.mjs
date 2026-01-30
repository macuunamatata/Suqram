#!/usr/bin/env node
/**
 * Rail integration helper (no deps).
 * Input: destination URL (e.g. ConfirmationURL) + optional rid
 * Output: rail link with #u=... payload + Supabase template snippet.
 *
 * Usage:
 *   node scripts/encode-fragment.mjs <destination_url> [rid]
 *   node scripts/encode-fragment.mjs "https://xxx.supabase.co/auth/v1/verify?token=abc&type=recovery"
 *   node scripts/encode-fragment.mjs "https://xxx.supabase.co/auth/v1/verify?token=abc&type=magiclink" my-rid-123
 *
 * Set RAIL_BASE_URL to override (default https://go.suqram.com).
 */

const args = process.argv.slice(2);
const destinationUrl = args[0];
const rid = args[1] || crypto.randomUUID();
const railBase = process.env.RAIL_BASE_URL || 'https://go.suqram.com';

if (!destinationUrl) {
  console.error('Usage: node scripts/encode-fragment.mjs <destination_url> [rid]');
  console.error('Example: node scripts/encode-fragment.mjs "https://xxx.supabase.co/auth/v1/verify?token=TOKEN&type=recovery"');
  process.exit(1);
}

// Same encoding the rail expects: fragment value = encodeURIComponent(destination)
const encoded = encodeURIComponent(destinationUrl);
const railLink = `${railBase.replace(/\/$/, '')}/r/${rid}#u=${encoded}`;

console.log('--- Rail link (use this in your email) ---');
console.log(railLink);
console.log('');
console.log('--- Supabase template snippet (paste into Email Template body) ---');
console.log('');
console.log('For Magic Link / Confirm signup / Password reset:');
console.log('Replace the default {{ .ConfirmationURL }} with a rail link.');
console.log('Generate the link server-side when sending the email (e.g. in a Supabase Auth hook or Edge Function):');
console.log('');
console.log('  const rid = crypto.randomUUID();');
console.log(`  const destination = '{{ .ConfirmationURL }}';  // or build verify URL with token`);
console.log('  const railLink = `${RAIL_BASE}/r/${rid}#u=${encodeURIComponent(destination)}`;');
console.log('  // Use railLink in the email body instead of raw destination');
console.log('');
console.log('Or with this script (from your backend), call:');
console.log(`  node scripts/encode-fragment.mjs "<CONFIRMATION_URL>" "<rid>"`);
console.log('  (Set RAIL_BASE_URL to your rail domain, e.g. https://links.yourdomain.com)');
console.log('');
console.log('--- Copy-paste values ---');
console.log('rid:', rid);
console.log('encoded u (fragment value):', encoded);
