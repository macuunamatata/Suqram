import { SiteConfig } from './shared';

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeHostname(input: string): string {
  let host = (input || '').trim().toLowerCase();
  // strip trailing dot
  while (host.endsWith('.')) host = host.slice(0, -1);

  // strip port if present (host:port)
  // Note: we intentionally keep this simple for common hostnames + IPv4.
  if (host.includes(':')) {
    // If bracketed IPv6: [::1]:8787 -> ::1
    if (host.startsWith('[')) {
      const end = host.indexOf(']');
      if (end !== -1) host = host.slice(1, end);
    } else {
      host = host.split(':')[0];
    }
  }

  return host;
}

function stripSat(site: SiteConfig): SiteConfig {
  // Return a SiteConfig-shaped object without leaking satHash for read endpoints
  return { ...site, satHash: '' };
}

export class SitesDO implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/get-by-hostname')) {
      return this.handleGetByHostname(request);
    } else if (path.startsWith('/get-by-sathash')) {
      return this.handleGetBySatHash(request);
    } else     if (path.startsWith('/verify-sat-by-token')) {
      return this.handleVerifySatByToken(request);
    } else if (path.startsWith('/verify-sat')) {
      return this.handleVerifySat(request);
    } else if (path.startsWith('/create')) {
      return this.handleCreate(request);
    } else if (path.startsWith('/list')) {
      return this.handleList();
    } else if (path.startsWith('/get')) {
      return this.handleGet(request);
    } else if (path.startsWith('/update')) {
      return this.handleUpdate(request);
    } else if (path.startsWith('/rotate-sat')) {
      return this.handleRotateSat(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  // Product-grade lookup by normalized hostname
  private async getSiteByHostname(hostname: string): Promise<SiteConfig | null> {
    const normalized = normalizeHostname(hostname);
    if (!normalized) return null;
    return await this.state.storage.get<SiteConfig>(`site:host:${normalized}`) || null;
  }

  private async handleGetByHostname(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.searchParams.get('hostname');
    
    if (!hostname) {
      return new Response(JSON.stringify({ error: 'Missing hostname' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const site = await this.getSiteByHostname(hostname);
    
    if (!site) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(stripSat(site)), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetBySatHash(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const satHashParam = url.searchParams.get('satHash');

    if (!satHashParam) {
      return new Response(JSON.stringify({ error: 'Missing satHash' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const satHash = satHashParam.trim().toLowerCase();
    if (!satHash) {
      return new Response(JSON.stringify({ error: 'Invalid satHash' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sites = await this.state.storage.get<string[]>('sites') || [];
    for (const siteId of sites) {
      const site = await this.state.storage.get<SiteConfig>(`site:id:${siteId}`);
      if (site && site.satHash && site.satHash.toLowerCase() === satHash) {
        return new Response(JSON.stringify(stripSat(site)), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid SAT' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleVerifySat(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.searchParams.get('hostname');
    const sat = url.searchParams.get('sat');
    
    if (!hostname || !sat) {
      return new Response(JSON.stringify({ error: 'Missing hostname or SAT' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const site = await this.getSiteByHostname(hostname);
    
    if (!site) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify SAT hash
    const satHash = await sha256Hex(sat);
    if (satHash !== site.satHash) {
      return new Response(JSON.stringify({ error: 'Invalid SAT' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return site config (without satHash)
    return new Response(JSON.stringify(stripSat(site)), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleVerifySatByToken(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sat = url.searchParams.get('sat');
    
    if (!sat) {
      return new Response(JSON.stringify({ error: 'Missing SAT' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash the SAT
    const satHash = await sha256Hex(sat);

    // Scan all sites to find matching SAT hash
    const sites = await this.state.storage.get<string[]>('sites') || [];
    for (const siteId of sites) {
      const site = await this.state.storage.get<SiteConfig>(`site:id:${siteId}`);
      if (site && site.satHash === satHash) {
        return new Response(JSON.stringify(stripSat(site)), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // No matching site found
    return new Response(JSON.stringify({ error: 'Invalid SAT' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleCreate(request: Request): Promise<Response> {
    let body: Partial<SiteConfig>;
    try {
      body = await request.json<Partial<SiteConfig>>();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!body.hostname || !body.originBaseUrl) {
      return new Response(JSON.stringify({ error: 'Missing hostname or originBaseUrl' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedHostname = normalizeHostname(body.hostname);
    if (!normalizedHostname) {
      return new Response(JSON.stringify({ error: 'Invalid hostname' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate originBaseUrl: must be https for non-local hosts
    const isLocalHost = body.originBaseUrl.startsWith('http://127.0.0.1') || 
                        body.originBaseUrl.startsWith('http://localhost');
    if (!isLocalHost && !body.originBaseUrl.startsWith('https://')) {
      return new Response(JSON.stringify({ error: 'originBaseUrl must be https for non-local hosts' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if site already exists
    const existing = await this.state.storage.get<SiteConfig>(`site:host:${normalizedHostname}`);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Site with this hostname already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate random siteId
    const siteId = generateRandomHex(16);

    // Generate Site Access Token (SAT) - return only once, then hash it
    const sat = generateRandomHex(32); // 64 hex chars
    const satHash = await sha256Hex(sat);

    const site: SiteConfig = {
      siteId,
      hostname: normalizedHostname,
      originBaseUrl: body.originBaseUrl,
      pathAllowlist: body.pathAllowlist || [],
      queryAllowlist: body.queryAllowlist || [],
      turnstileEnabled: body.turnstileEnabled || false,
      turnstileSiteKey: body.turnstileSiteKey || '',
      satHash,
      createdAt: Date.now(),
    };

    // Store by hostname (for lookup) and by siteId (for admin API)
    await this.state.storage.put(`site:host:${normalizedHostname}`, site);
    await this.state.storage.put(`site:id:${siteId}`, site);
    // Also store lookup: siteId -> hostname
    await this.state.storage.put(`site:id:${siteId}:hostname`, normalizedHostname);

    // Add to list of all sites
    const sites = await this.state.storage.get<string[]>('sites') || [];
    if (!sites.includes(siteId)) {
      sites.push(siteId);
      await this.state.storage.put('sites', sites);
    }

    // Return site config with SAT (only time it's exposed) and satHash (hashed SAT)
    const response: SiteConfig & { sat: string } = {
      ...site,
      sat,
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleList(): Promise<Response> {
    const sites = await this.state.storage.get<string[]>('sites') || [];
    const siteList: Array<Omit<SiteConfig, 'satHash'>> = [];

    for (const siteId of sites) {
      const site = await this.state.storage.get<SiteConfig>(`site:id:${siteId}`);
      if (site) {
        siteList.push(stripSat(site));
      }
    }

    return new Response(JSON.stringify({ sites: siteList }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGet(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    
    if (!siteId) {
      return new Response(JSON.stringify({ error: 'Missing siteId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const site = await this.state.storage.get<SiteConfig>(`site:id:${siteId}`);
    
    if (!site) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(stripSat(site)), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleUpdate(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    
    if (!siteId) {
      return new Response(JSON.stringify({ error: 'Missing siteId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await this.state.storage.get<SiteConfig>(`site:id:${siteId}`);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let body: Partial<SiteConfig>;
    try {
      body = await request.json<Partial<SiteConfig>>();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Validate originBaseUrl if provided
    if (body.originBaseUrl) {
      const urlString = body.originBaseUrl;
      let valid = false;
      if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
        try {
          // eslint-disable-next-line no-new
          new URL(urlString);
          valid = true;
        } catch (e) {
          valid = false;
        }
      }
      if (!valid) {
        return new Response(JSON.stringify({ error: 'originBaseUrl must be http(s) URL' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate and normalize pathAllowlist if provided
    if (body.pathAllowlist) {
      if (!Array.isArray(body.pathAllowlist)) {
        return new Response(JSON.stringify({ error: 'pathAllowlist must be an array of strings' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const normalizedPaths: string[] = [];
      for (const item of body.pathAllowlist) {
        if (typeof item !== 'string') {
          return new Response(JSON.stringify({ error: 'pathAllowlist must be an array of strings' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const trimmed = item.trim();
        if (trimmed) {
          if (trimmed.startsWith('/')) {
            normalizedPaths.push(trimmed);
          } else {
            normalizedPaths.push('/' + trimmed);
          }
        }
      }
      body.pathAllowlist = normalizedPaths;
    }

    // Validate and normalize queryAllowlist if provided
    if (body.queryAllowlist) {
      if (!Array.isArray(body.queryAllowlist)) {
        return new Response(JSON.stringify({ error: 'queryAllowlist must be an array of strings' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const normalizedKeys: string[] = [];
      for (const item of body.queryAllowlist) {
        if (typeof item !== 'string') {
          return new Response(JSON.stringify({ error: 'queryAllowlist must be an array of strings' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const trimmed = item.trim();
        if (trimmed) {
          normalizedKeys.push(trimmed);
        }
      }
      body.queryAllowlist = normalizedKeys;
    }
    
    // Update fields (preserve siteId, hostname, createdAt, satHash)
    const updated: SiteConfig = {
      ...existing,
      ...body,
      siteId: existing.siteId,
      hostname: existing.hostname,
      createdAt: existing.createdAt,
      satHash: existing.satHash, // Never update satHash via PATCH
    };

    // Update both storage keys
    await this.state.storage.put(`site:host:${existing.hostname}`, updated);
    await this.state.storage.put(`site:id:${siteId}`, updated);

    return new Response(JSON.stringify(stripSat(updated)), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleRotateSat(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    
    if (!siteId) {
      return new Response(JSON.stringify({ error: 'Missing siteId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await this.state.storage.get<SiteConfig>(`site:id:${siteId}`);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate new SAT
    const newSat = generateRandomHex(32); // 64 hex chars
    const newSatHash = await sha256Hex(newSat);

    // Update site with new SAT hash
    const updated: SiteConfig = {
      ...existing,
      satHash: newSatHash,
    };

    // Update both storage keys
    await this.state.storage.put(`site:host:${existing.hostname}`, updated);
    await this.state.storage.put(`site:id:${siteId}`, updated);

    // Return new SAT (only time it's exposed)
    return new Response(JSON.stringify({
      siteId: existing.siteId,
      hostname: existing.hostname,
      sat: newSat,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
