import { NonceData, LinkEvent, NONCE_TTL, MAX_EVENTS_PER_SITE, EVENT_RETENTION_MS, RATE_LIMIT_PHASE_A, RATE_LIMIT_PHASE_B, RATE_LIMIT_WINDOW_MS } from './shared';

export interface Env {
  ORIGIN_BASE_URL?: string;
}

export class LinkGuardDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/mint')) {
      return this.handleMint(request);
    } else if (path.startsWith('/redeem')) {
      return this.handleRedeem(request);
    } else if (path.startsWith('/events')) {
      return this.handleGetEvents(request);
    } else if (path.startsWith('/log-event')) {
      return this.handleLogEvent(request);
    } else     if (path.startsWith('/get-proofseed')) {
      return this.handleGetProofSeed(request);
    } else if (path.startsWith('/rate-limit')) {
      return this.handleRateLimit(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleMint(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const originUrl = url.searchParams.get('originUrl');
    const continuityId = url.searchParams.get('continuityId');
    const proofSeed = url.searchParams.get('proofSeed') || undefined;
    const ip = url.searchParams.get('ip') || undefined;
    const ua = url.searchParams.get('ua') || undefined;
    const note = url.searchParams.get('note') || undefined;
    const siteId = url.searchParams.get('siteId') || undefined;
    const hostname = url.searchParams.get('hostname') || undefined;
    
    if (!originUrl) {
      return new Response(JSON.stringify({ error: 'Missing originUrl', reason: 'missing_origin_url' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!continuityId) {
      return new Response(JSON.stringify({ error: 'Missing continuityId', reason: 'missing_session_cookie' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate a deterministic nonce (using timestamp + originUrl hash)
    const timestamp = Date.now();
    const nonce = await this.generateNonce(originUrl, timestamp);
    
    // TTL override for local dev (query param __ttl_ms)
    // Clamp to [50, 300000] as defense in depth (worker should already clamp)
    const ttlOverride = url.searchParams.get('__ttl_ms');
    let ttl = NONCE_TTL;
    if (ttlOverride) {
      const parsed = parseInt(ttlOverride, 10);
      if (!isNaN(parsed) && parsed > 0) {
        ttl = Math.max(50, Math.min(300000, parsed));
      }
    }
    
    const nonceData: NonceData = {
      nonce,
      originUrl,
      createdAt: timestamp,
      ttl: ttl > 0 ? ttl : NONCE_TTL, // Ensure positive TTL
      redeemed: false,
      continuityId,
      proofSeed, // Store for debugging
    };

    // Store nonce data
    await this.state.storage.put(`nonce:${nonce}`, nonceData);

    // Add event with notes
    await this.addEvent({
      nonce,
      timestamp,
      action: 'minted',
      originUrl,
      ip,
      ua,
      note,
      siteId,
      hostname,
    });

    return new Response(JSON.stringify({ nonce }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleRedeem(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const nonce = url.searchParams.get('nonce');
    const continuityId = url.searchParams.get('continuityId');
    
    if (!nonce) {
      return new Response(JSON.stringify({ error: 'Missing nonce', reason: 'missing_nonce' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!continuityId) {
      return new Response(JSON.stringify({ error: 'Missing continuityId', reason: 'missing_session_cookie' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const nonceData = await this.state.storage.get<NonceData>(`nonce:${nonce}`);
    
    if (!nonceData) {
      return new Response(JSON.stringify({ error: 'Nonce not found', reason: 'nonce_not_found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ip = url.searchParams.get('ip') || undefined;
    const ua = url.searchParams.get('ua') || undefined;
    const note = url.searchParams.get('note') || undefined;
    const siteId = url.searchParams.get('siteId') || undefined;
    const hostname = url.searchParams.get('hostname') || undefined;

    // Check session mismatch
    if (nonceData.continuityId !== continuityId) {
      const mismatchNote = note ? `${note}, Session mismatch` : 'Session mismatch';
      await this.addEvent({
        nonce,
        timestamp: Date.now(),
        action: 'expired',
        originUrl: nonceData.originUrl,
        ip,
        ua,
        note: mismatchNote,
        siteId,
        hostname,
      });
      return new Response(JSON.stringify({ error: 'Session mismatch', reason: 'session_mismatch' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if already redeemed
    if (nonceData.redeemed) {
      const alreadyRedeemedNote = note ? `${note}, Already redeemed` : 'Already redeemed';
      await this.addEvent({
        nonce,
        timestamp: Date.now(),
        action: 'replay',
        originUrl: nonceData.originUrl,
        ip,
        ua,
        note: alreadyRedeemedNote,
        siteId,
        hostname,
      });
      return new Response(JSON.stringify({ error: 'Nonce already redeemed', reason: 'already_used' }), { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check TTL
    const now = Date.now();
    if (now - nonceData.createdAt > nonceData.ttl) {
      const expiredNote = note ? `${note}, TTL expired` : 'TTL expired';
      await this.addEvent({
        nonce,
        timestamp: now,
        action: 'expired',
        originUrl: nonceData.originUrl,
        ip,
        ua,
        note: expiredNote,
        siteId,
        hostname,
      });
      await this.state.storage.delete(`nonce:${nonce}`);
      return new Response(JSON.stringify({ error: 'Nonce expired', reason: 'expired' }), { 
        status: 410,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Mark as redeemed
    nonceData.redeemed = true;
    await this.state.storage.put(`nonce:${nonce}`, nonceData);

    // Add event with notes
    await this.addEvent({
      nonce,
      timestamp: now,
      action: 'redeemed',
      originUrl: nonceData.originUrl,
      ip,
      ua,
      note,
      siteId,
      hostname,
    });

    return new Response(JSON.stringify({ 
      success: true,
      originUrl: nonceData.originUrl 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetEvents(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId') || 'global';
    const eventsKey = `events:${siteId}`;
    const events = await this.state.storage.get<LinkEvent[]>(eventsKey) || [];
    
    // Parse query parameters
    const limitParam = url.searchParams.get('limit');
    const typeParam = url.searchParams.get('type');
    const actionParam = url.searchParams.get('action');
    const sinceParam = url.searchParams.get('since');
    const untilParam = url.searchParams.get('until');
    const hostnameParam = url.searchParams.get('hostname');
    
    // Default limit is MAX_EVENTS_PER_SITE, but allow override
    let limit = MAX_EVENTS_PER_SITE;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_EVENTS_PER_SITE);
      }
    }
    
    // Filter by type if specified (comma-separated)
    let filteredEvents = events;
    const typeOrAction = (actionParam && actionParam.trim().length > 0) ? actionParam : typeParam;
    if (typeOrAction) {
      const allowedTypes = typeOrAction.split(',').map(t => t.trim()).filter(t => t);
      if (allowedTypes.length > 0) {
        filteredEvents = events.filter(e => allowedTypes.includes(e.action));
      }
    }
    
    // Filter by hostname if specified
    if (hostnameParam) {
      const h = hostnameParam.trim();
      if (h) {
        filteredEvents = filteredEvents.filter(e => e.hostname === h);
      }
    }
    
    // Filter by timestamp if specified
    if (sinceParam) {
      const sinceTimestamp = parseInt(sinceParam, 10);
      if (!isNaN(sinceTimestamp) && sinceTimestamp > 0) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= sinceTimestamp);
      }
    }
    
    // Filter by until timestamp if specified
    if (untilParam) {
      const untilTimestamp = parseInt(untilParam, 10);
      if (!isNaN(untilTimestamp) && untilTimestamp > 0) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= untilTimestamp);
      }
    }
    
    // Sort by timestamp descending (most recent first) and limit
    const sortedEvents = filteredEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    return new Response(JSON.stringify({ events: sortedEvents }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async generateNonce(originUrl: string, timestamp: number): Promise<string> {
    // Create a deterministic hash from originUrl + timestamp
    const data = `${originUrl}:${timestamp}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Use first 16 characters as nonce
    return hashHex.substring(0, 16);
  }

  private async handleLogEvent(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const nonce = url.searchParams.get('nonce') || 'unknown';
    const action = url.searchParams.get('action') || 'expired';
    const note = url.searchParams.get('note') || undefined;
    const ip = url.searchParams.get('ip') || undefined;
    const ua = url.searchParams.get('ua') || undefined;
    const siteId = url.searchParams.get('siteId') || undefined;
    const hostname = url.searchParams.get('hostname') || undefined;

    await this.addEvent({
      nonce,
      timestamp: Date.now(),
      action: action as 'minted' | 'redeemed' | 'expired' | 'denied' | 'replay',
      ip,
      ua,
      note,
      siteId,
      hostname,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetProofSeed(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const nonce = url.searchParams.get('nonce');
    
    if (!nonce) {
      return new Response(JSON.stringify({ error: 'Missing nonce' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const nonceData = await this.state.storage.get<NonceData>(`nonce:${nonce}`);
    
    if (!nonceData) {
      return new Response(JSON.stringify({ error: 'Nonce not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      proofSeed: nonceData.proofSeed || null
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleRateLimit(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const ip = url.searchParams.get('ip');
    const phase = url.searchParams.get('phase') as 'A' | 'B';
    const siteId = url.searchParams.get('siteId') || 'global';
    
    if (!ip || !phase) {
      return new Response(JSON.stringify({ error: 'Missing ip or phase' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Rate limit key is deterministic by site + IP (per-minute windows)
    const limit = phase === 'A' ? RATE_LIMIT_PHASE_A : RATE_LIMIT_PHASE_B;
    const key = `ratelimit:${siteId}:${ip}:${phase}`;
    const now = Date.now();
    
    // Get current count and window start
    const rateLimitData = await this.state.storage.get<{ count: number; windowStart: number; expiresAt: number }>(key);
    
    let count = 0;
    let windowStart = now;
    
    if (rateLimitData) {
      // Check if we're still in the same window and not expired
      if (now < rateLimitData.expiresAt && now - rateLimitData.windowStart < RATE_LIMIT_WINDOW_MS) {
        count = rateLimitData.count;
        windowStart = rateLimitData.windowStart;
      }
      // Otherwise, start a new window
    }
    
    // Increment count
    count++;
    
    // Store updated count with expiration timestamp
    const expiresAt = now + RATE_LIMIT_WINDOW_MS + 1000; // Add 1 second buffer
    await this.state.storage.put(key, { count, windowStart, expiresAt });
    
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    
    return new Response(JSON.stringify({ allowed, remaining, limit }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async addEvent(event: LinkEvent): Promise<void> {
    // Store events per site
    const siteId = event.siteId || 'global';
    const eventsKey = `events:${siteId}`;
    const events = await this.state.storage.get<LinkEvent[]>(eventsKey) || [];
    
    // Add new event
    events.push(event);
    
    // Apply retention: remove events older than retention window
    const now = Date.now();
    const retentionCutoff = now - EVENT_RETENTION_MS;
    const filteredEvents = events.filter(e => e.timestamp >= retentionCutoff);
    
    // Keep only the most recent MAX_EVENTS_PER_SITE events
    const sortedEvents = filteredEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_EVENTS_PER_SITE);
    
    await this.state.storage.put(eventsKey, sortedEvents);
  }
}
