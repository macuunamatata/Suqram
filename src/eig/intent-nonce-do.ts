// IntentNonceDO: Manages single-use nonces for Intent Attestations

export interface Env {
  // No env vars needed for this DO
}

export interface NonceRecord {
  nonce: string;
  token: string;
  continuity_hash: string;
  created_at: number;
  expires_at: number;
  redeemed: boolean;
  redeemed_at: number | null;
}

export type NonceError = 'EXPIRED' | 'REPLAY' | 'CONTINUITY_MISMATCH' | 'NOT_FOUND';

export interface IssueResult {
  nonce: string;
  exp: number; // expiration timestamp (ms)
}

export interface RedeemResult {
  ok: true;
}

export interface RedeemError {
  ok: false;
  error: NonceError;
}

export class IntentNonceDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/issue')) {
      return this.handleIssue(request);
    } else if (path.startsWith('/redeem')) {
      return this.handleRedeem(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Issue a new nonce for a token + continuity_hash
   * POST /issue?token=...&continuity_hash=...&ttl_ms=...
   */
  private async handleIssue(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const continuityHash = url.searchParams.get('continuity_hash');
    const ttlMsParam = url.searchParams.get('ttl_ms');

    if (!token || !continuityHash) {
      return new Response(
        JSON.stringify({ error: 'Missing token or continuity_hash' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse TTL (default 5 minutes, clamp to 1-30 minutes)
    let ttlMs = 5 * 60 * 1000; // 5 minutes default
    if (ttlMsParam) {
      const parsed = parseInt(ttlMsParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        ttlMs = Math.max(60 * 1000, Math.min(30 * 60 * 1000, parsed)); // 1-30 min
      }
    }

    const now = Date.now();
    const expiresAt = now + ttlMs;

    // Generate deterministic nonce from token + continuity_hash + timestamp
    const nonce = await this.generateNonce(token, continuityHash, now);

    const record: NonceRecord = {
      nonce,
      token,
      continuity_hash: continuityHash,
      created_at: now,
      expires_at: expiresAt,
      redeemed: false,
      redeemed_at: null,
    };

    // Store nonce (keyed by nonce for fast lookup)
    await this.state.storage.put(`nonce:${nonce}`, record);

    // Also store index by token+continuity for cleanup
    const indexKey = `index:${token}:${continuityHash}`;
    const existing = await this.state.storage.get<string[]>(indexKey) || [];
    existing.push(nonce);
    await this.state.storage.put(indexKey, existing);

    const result: IssueResult = {
      nonce,
      exp: expiresAt,
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Redeem a nonce (atomic, single-use)
   * POST /redeem?nonce=...&continuity_hash=...
   */
  private async handleRedeem(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const nonce = url.searchParams.get('nonce');
    const continuityHash = url.searchParams.get('continuity_hash');

    if (!nonce || !continuityHash) {
      return new Response(
        JSON.stringify({ error: 'Missing nonce or continuity_hash' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const record = await this.state.storage.get<NonceRecord>(`nonce:${nonce}`);

    if (!record) {
      const error: RedeemError = { ok: false, error: 'NOT_FOUND' };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check continuity mismatch
    if (record.continuity_hash !== continuityHash) {
      const error: RedeemError = { ok: false, error: 'CONTINUITY_MISMATCH' };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if already redeemed
    if (record.redeemed) {
      const error: RedeemError = { ok: false, error: 'REPLAY' };
      return new Response(JSON.stringify(error), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check expiration
    const now = Date.now();
    if (now > record.expires_at) {
      const error: RedeemError = { ok: false, error: 'EXPIRED' };
      return new Response(JSON.stringify(error), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mark as redeemed (atomic update)
    record.redeemed = true;
    record.redeemed_at = now;
    await this.state.storage.put(`nonce:${nonce}`, record);

    const result: RedeemResult = { ok: true };
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Generate deterministic nonce from token + continuity_hash + timestamp
   */
  private async generateNonce(
    token: string,
    continuityHash: string,
    timestamp: number
  ): Promise<string> {
    const data = `${token}:${continuityHash}:${timestamp}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    // Use first 32 hex chars (16 bytes) as nonce
    return hashHex.substring(0, 32);
  }
}
