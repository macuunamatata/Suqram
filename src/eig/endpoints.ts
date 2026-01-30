// Additional EIG endpoints: /health, /.well-known/jwks.json, /verify

import { verifyAttestation, generateJWKS, importPublicKeyFromJwk } from './attestation';
import { attestationExists } from './db';

export interface Env {
  EIG_DB: D1Database;
  EIG_KEY_ID?: string;
  EIG_PUBLIC_KEY_JWK?: string;
}

/**
 * GET /health - Health check
 */
export async function handleHealth(_request?: Request, _env?: Env): Promise<Response> {
  return new Response('ok', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * GET /.well-known/jwks.json - Publish public keys for verification
 */
export async function handleJWKS(env: Env): Promise<Response> {
  // TODO: Load public keys from D1 or env
  // For V1, we'll use a single key from env
  // In production, this should load from a keys table in D1

  if (!env.EIG_PUBLIC_KEY_JWK) {
    return new Response(
      JSON.stringify({ error: 'JWKS not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const jwk = JSON.parse(env.EIG_PUBLIC_KEY_JWK);
    const publicKey = await importPublicKeyFromJwk(jwk);
    const kid = env.EIG_KEY_ID || 'default';

    const jwks = await generateJWKS([{ kid, publicKey }]);
    return new Response(JSON.stringify(jwks), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to generate JWKS', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /verify - Verify attestation signature and check ledger
 */
export async function handleVerify(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json<{ jws: string }>();
    if (!body.jws) {
      return new Response(
        JSON.stringify({ error: 'Missing jws' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load public key from JWKS
    if (!env.EIG_PUBLIC_KEY_JWK) {
      return new Response(
        JSON.stringify({ error: 'Verification key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const jwk = JSON.parse(env.EIG_PUBLIC_KEY_JWK);
    const publicKey = await importPublicKeyFromJwk(jwk);

    // Verify signature
    const verification = await verifyAttestation(body.jws, publicKey);
    if (!verification.valid || !verification.claims) {
      return new Response(
        JSON.stringify({
          decision: 'denied',
          reason: verification.error || 'verification_failed',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify aud claim (must start with "hubspot")
    if (!verification.claims.aud || !verification.claims.aud.startsWith('hubspot')) {
      return new Response(
        JSON.stringify({
          decision: 'denied',
          reason: 'invalid_audience',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if event exists in ledger
    const exists = await attestationExists(env.EIG_DB, verification.claims.jti);

    return new Response(
      JSON.stringify({
        decision: 'verified',
        claims: verification.claims,
        in_ledger: exists,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
