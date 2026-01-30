// TenantConfigDO: Minimal tenant configuration storage

export interface Env {
  // No env vars needed
}

export interface TenantConfig {
  tenant_id: string;
  hostname: string;
  policy_template: 'low_friction' | 'b2b_corporate' | 'high_sensitivity';
  created_at: number;
  updated_at: number;
}

export class TenantConfigDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/get-by-hostname')) {
      return this.handleGetByHostname(request);
    }

    if (path.startsWith('/set-host')) {
      return this.handleSetHost(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Get tenant config by hostname
   * GET /get-by-hostname?hostname=...
   */
  private async handleGetByHostname(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.searchParams.get('hostname');

    if (!hostname) {
      return new Response(
        JSON.stringify({ error: 'Missing hostname' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const normalized = this.normalizeHostname(hostname);
    const config = await this.state.storage.get<TenantConfig>(
      `config:host:${normalized}`
    );

    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Set tenant config by hostname
   * POST /set-host
   * Body: { hostname: string, tenant_id: string, policy_template: string }
   */
  private async handleSetHost(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json<{
        hostname: string;
        tenant_id: string;
        policy_template: 'low_friction' | 'b2b_corporate' | 'high_sensitivity';
      }>();

      if (!body.hostname || !body.tenant_id || !body.policy_template) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: hostname, tenant_id, policy_template' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const normalized = this.normalizeHostname(body.hostname);
      const now = Date.now();

      const config: TenantConfig = {
        tenant_id: body.tenant_id,
        hostname: normalized,
        policy_template: body.policy_template,
        created_at: now,
        updated_at: now,
      };

      // Store by normalized hostname
      await this.state.storage.put(`config:host:${normalized}`, config);

      return new Response(JSON.stringify({ ok: true, hostname: normalized }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  private normalizeHostname(input: string): string {
    let host = (input || '').trim().toLowerCase();
    while (host.endsWith('.')) host = host.slice(0, -1);
    if (host.includes(':')) {
      if (host.startsWith('[')) {
        const end = host.indexOf(']');
        if (end !== -1) host = host.slice(1, end);
      } else {
        host = host.split(':')[0];
      }
    }
    return host;
  }
}
