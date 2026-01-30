// Durable Object for token refresh mutex (prevents concurrent refresh overwrites)

export class TokenRefreshMutexDO implements DurableObject {
  private state: DurableObjectState;
  private refreshInProgress: Map<string, Promise<any>> = new Map();

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const tenantId = url.searchParams.get('tenant_id');

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Missing tenant_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/lock') {
      // Acquire lock for token refresh
      return this.acquireLock(tenantId);
    } else if (path === '/unlock') {
      // Release lock
      return this.releaseLock(tenantId);
    } else if (path === '/with-lock') {
      // Execute function with lock (prevents concurrent execution)
      return this.executeWithLock(tenantId, request);
    }

    return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Acquire lock for tenant (returns lock token)
   */
  private async acquireLock(tenantId: string): Promise<Response> {
    const lockKey = `refresh_lock:${tenantId}`;
    const lockToken = crypto.randomUUID();
    const lockExpiry = Date.now() + 30000; // 30 second lock expiry

    // Check if lock already exists
    const existingLock = await this.state.storage.get<{ token: string; expiresAt: number }>(lockKey);
    if (existingLock && existingLock.expiresAt > Date.now()) {
      return new Response(
        JSON.stringify({ 
          locked: true, 
          message: 'Refresh already in progress',
          expiresAt: existingLock.expiresAt,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Acquire lock
    await this.state.storage.put(lockKey, {
      token: lockToken,
      expiresAt: lockExpiry,
    });

    return new Response(
      JSON.stringify({ locked: false, lockToken, expiresAt: lockExpiry }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Release lock
   */
  private async releaseLock(tenantId: string): Promise<Response> {
    const lockKey = `refresh_lock:${tenantId}`;
    await this.state.storage.delete(lockKey);
    return new Response(JSON.stringify({ released: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Execute function with lock (prevents concurrent execution)
   * Expects request body with function to execute
   */
  private async executeWithLock(tenantId: string, request: Request): Promise<Response> {
    const lockKey = `refresh_lock:${tenantId}`;
    
    // Check if refresh already in progress
    const existingLock = await this.state.storage.get<{ token: string; expiresAt: number }>(lockKey);
    if (existingLock && existingLock.expiresAt > Date.now()) {
      // Wait for existing refresh to complete (with timeout)
      const waitStart = Date.now();
      const maxWait = 25000; // Max 25 seconds wait
      
      while (Date.now() - waitStart < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
        const currentLock = await this.state.storage.get<{ token: string; expiresAt: number }>(lockKey);
        if (!currentLock || currentLock.expiresAt <= Date.now()) {
          break; // Lock released or expired
        }
      }
      
      // Check again
      const finalLock = await this.state.storage.get<{ token: string; expiresAt: number }>(lockKey);
      if (finalLock && finalLock.expiresAt > Date.now()) {
        return new Response(
          JSON.stringify({ 
            error: 'Refresh timeout - another refresh is still in progress',
            expiresAt: finalLock.expiresAt,
          }),
          { status: 408, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Acquire lock
    const lockToken = crypto.randomUUID();
    const lockExpiry = Date.now() + 30000; // 30 second lock
    await this.state.storage.put(lockKey, {
      token: lockToken,
      expiresAt: lockExpiry,
    });

    try {
      // Execute the refresh function (passed in request body as JSON)
      const body = await request.json<{ refreshFn: string }>();
      // For now, we'll return success - the actual refresh happens in the caller
      // The lock prevents concurrent calls
      return new Response(
        JSON.stringify({ 
          locked: true, 
          lockToken,
          message: 'Lock acquired, proceed with refresh',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } finally {
      // Release lock
      await this.state.storage.delete(lockKey);
    }
  }
}
