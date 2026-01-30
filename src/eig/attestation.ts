// Intent Attestation: Ed25519-signed JWT/JWS

export interface AttestationClaims {
  iss: string; // "eig:{tenant_id}"
  aud: string; // "hubspot:{portal_id}" or "hubspot"
  jti: string; // event_id (unique)
  iat: number; // issued at (seconds)
  exp: number; // expiration (seconds, iat + 600)
  nonce: string; // nonce id or hash
  tid: string; // tenant_id
  evt: string; // "IntentAttestedClick"
  sub: string; // subject hash (sha256 of email/contact_id)
  dst: string; // destination host only
  tok: string; // token or token hash
  cmp?: {
    campaign_id?: string;
    message_id?: string;
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
  };
  flags: {
    proof: 'turnstile_invisible' | 'turnstile_challenge' | 'explicit_confirm';
    replay: false;
  };
}

export interface KeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  kid: string; // key id
}

/**
 * Generate Ed25519 key pair for signing
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true, // extractable
    ['sign', 'verify']
  ) as CryptoKeyPair;

  // Export public key to get kid (hash of public key)
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const kid = await sha256Hex(JSON.stringify(publicKeyJwk));

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    kid,
  };
}

/**
 * Import private key from raw bytes (for loading from env/secret)
 */
export async function importPrivateKey(
  rawKey: Uint8Array,
  kid: string
): Promise<CryptoKey> {
  // Ed25519 private key in raw format (32 bytes)
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true,
    ['sign']
  );
}

/**
 * Import public key from JWK format
 */
export async function importPublicKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true,
    ['verify']
  );
}

/**
 * Sign attestation claims and return compact JWS
 */
export async function signAttestation(
  claims: AttestationClaims,
  privateKey: CryptoKey,
  kid: string
): Promise<string> {
  // JWT header
  const header = {
    alg: 'EdDSA',
    kid,
  };

  // Base64URL encode header
  const headerB64 = base64UrlEncode(JSON.stringify(header));

  // Base64URL encode payload
  const payloadB64 = base64UrlEncode(JSON.stringify(claims));

  // Sign header.payload
  const message = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const signature = await crypto.subtle.sign('Ed25519', privateKey, messageBytes);

  // Base64URL encode signature
  const signatureB64 = base64UrlEncode(
    Array.from(new Uint8Array(signature))
      .map((b) => String.fromCharCode(b))
      .join('')
  );

  // Compact JWS: header.payload.signature
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Verify attestation signature
 */
export async function verifyAttestation(
  jws: string,
  publicKey: CryptoKey
): Promise<{ valid: boolean; claims?: AttestationClaims; error?: string }> {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid JWS format' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode and verify header
  let header: { alg: string; kid?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerB64));
    if (header.alg !== 'EdDSA') {
      return { valid: false, error: 'Invalid algorithm' };
    }
  } catch (e) {
    return { valid: false, error: 'Invalid header' };
  }

  // Decode payload
  let claims: AttestationClaims;
  try {
    claims = JSON.parse(base64UrlDecode(payloadB64));
  } catch (e) {
    return { valid: false, error: 'Invalid payload' };
  }

  // Verify signature
  const message = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const signatureBytes = base64UrlDecodeBytes(signatureB64);

  try {
    const valid = await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      signatureBytes,
      messageBytes
    );

    if (!valid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      return { valid: false, error: 'Attestation expired' };
    }

    return { valid: true, claims };
  } catch (e) {
    return { valid: false, error: 'Verification failed' };
  }
}

/**
 * Generate JWKS (JSON Web Key Set) from public keys
 */
export async function generateJWKS(publicKeys: Array<{ kid: string; publicKey: CryptoKey }>): Promise<{
  keys: Array<{
    kty: string;
    crv: string;
    kid: string;
    x: string;
    use: string;
  }>;
}> {
  const keys = [];

  for (const { kid, publicKey } of publicKeys) {
    const jwk = await crypto.subtle.exportKey('jwk', publicKey) as JsonWebKey;
    keys.push({
      kty: jwk.kty!,
      crv: jwk.crv!,
      kid,
      x: jwk.x!,
      use: 'sig',
    });
  }

  return { keys };
}

// Base64URL encoding/decoding helpers

function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  const padded = base64 + '='.repeat(padding ? 4 - padding : 0);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function base64UrlDecodeBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  const padded = base64 + '='.repeat(padding ? 4 - padding : 0);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
