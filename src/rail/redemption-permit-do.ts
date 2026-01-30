// RedemptionPermitDO: short-lived, single-use Redemption Permit (nonce + TTL) for Auth Link Scanner Immunity Rail

export interface Env {
  // No env vars needed
}

export interface PermitRecord {
  nonce: string;
  rid: string;
  continuity_hash: string;
  created_at: number;
  expires_at: number;
  redeemed: boolean;
  redeemed_at: number | null;
}

export type RedeemReason = 'NOT_FOUND' | 'EXPIRED' | 'REPLAY' | 'CONTINUITY_MISMATCH' | 'BAD_BODY';

export interface IssueResult {
  nonce: string;
  exp: number;
}

export interface RedeemOk {
  ok: true;
}

export interface RedeemFail {
  ok: false;
  reason: RedeemReason;
}

export class RedemptionPermitDO implements DurableObject {
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
    }
    if (path.startsWith('/redeem')) {
      return this.handleRedeem(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * issue(rid, continuity_hash) -> nonce, exp
   */
  private async handleIssue(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const rid = url.searchParams.get('rid');
    const continuityHash = url.searchParams.get('continuity_hash');
    const ttlMsParam = url.searchParams.get('ttl_ms');

    if (!rid || !continuityHash) {
      return new Response(
        JSON.stringify({ error: 'Missing rid or continuity_hash' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let ttlMs = 5 * 60 * 1000;
    if (ttlMsParam) {
      const parsed = parseInt(ttlMsParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        ttlMs = Math.max(60 * 1000, Math.min(30 * 60 * 1000, parsed));
      }
    }

    const now = Date.now();
    const expiresAt = now + ttlMs;
    const nonce = await this.generateNonce(rid, continuityHash, now);

    const record: PermitRecord = {
      nonce,
      rid,
      continuity_hash: continuityHash,
      created_at: now,
      expires_at: expiresAt,
      redeemed: false,
      redeemed_at: null,
    };

    await this.state.storage.put(`nonce:${nonce}`, record);

    const indexKey = `index:${rid}:${continuityHash}`;
    const existing = (await this.state.storage.get<string[]>(indexKey)) || [];
    existing.push(nonce);
    await this.state.storage.put(indexKey, existing);

    const result: IssueResult = { nonce, exp: expiresAt };
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * redeem(rid, continuity_hash, nonce) -> ok or reason
   */
  private async handleRedeem(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const nonce = url.searchParams.get('nonce');
    const continuityHash = url.searchParams.get('continuity_hash');
    const rid = url.searchParams.get('rid');

    if (!nonce || !continuityHash) {
      const error: RedeemFail = { ok: false, reason: 'BAD_BODY' };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const record = await this.state.storage.get<PermitRecord>(`nonce:${nonce}`);

    if (!record) {
      const error: RedeemFail = { ok: false, reason: 'NOT_FOUND' };
      return new Response(JSON.stringify(error), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (rid && record.rid !== rid) {
      const error: RedeemFail = { ok: false, reason: 'BAD_BODY' };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (record.continuity_hash !== continuityHash) {
      const error: RedeemFail = { ok: false, reason: 'CONTINUITY_MISMATCH' };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (record.redeemed) {
      const error: RedeemFail = { ok: false, reason: 'REPLAY' };
      return new Response(JSON.stringify(error), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = Date.now();
    if (now > record.expires_at) {
      const error: RedeemFail = { ok: false, reason: 'EXPIRED' };
      return new Response(JSON.stringify(error), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    record.redeemed = true;
    record.redeemed_at = now;
    await this.state.storage.put(`nonce:${nonce}`, record);

    const result: RedeemOk = { ok: true };
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async generateNonce(rid: string, continuityHash: string, timestamp: number): Promise<string> {
    const data = `${rid}:${continuityHash}:${timestamp}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }
}
