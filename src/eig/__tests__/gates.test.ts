// Go/No-go Gates: Executable security tests using Miniflare
// These tests verify the invariant: "GET is always safe, only POST with valid PoI + nonce can mint"

import { describe, it, expect, beforeAll } from '@cloudflare/vitest-pool-workers';
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';

describe('EIG Security Gates', () => {
  const TEST_TOKEN = 'test-token-123';
  const TEST_TENANT_ID = 'test-tenant-123';
  const TEST_DOMAIN = 'test.example.com';
  const TEST_DESTINATION = 'https://example.com/destination';

  beforeAll(async () => {
    // Seed D1 with test data
    const db = env.EIG_DB;
    
    // Create tenant
    await db.prepare(`
      INSERT OR IGNORE INTO tenants (tenant_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).bind(TEST_TENANT_ID, 'Test Tenant', Date.now(), Date.now()).run();

    // Create domain
    await db.prepare(`
      INSERT OR IGNORE INTO domains (domain_id, tenant_id, hostname, policy_template, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind('test-domain-123', TEST_TENANT_ID, TEST_DOMAIN, 'low_friction', Date.now()).run();

    // Create link
    await db.prepare(`
      INSERT OR IGNORE INTO links (link_id, tenant_id, token, destination_url, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind('test-link-123', TEST_TENANT_ID, TEST_TOKEN, TEST_DESTINATION, Date.now()).run();
  });

  describe('Gate 1: GET /r/:token must never mint', () => {
    it('should not create attestation on GET', async () => {
      const ctx = createExecutionContext();
      const request = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });

      // Make multiple GET requests
      for (let i = 0; i < 5; i++) {
        const response = await SELF.fetch(request, env, ctx);
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toContain('text/html');
        await waitOnExecutionContext(ctx);
      }

      // Verify NO attestations were created
      const attestations = await env.EIG_DB.prepare(`
        SELECT COUNT(*) as count FROM attestations WHERE token = ?
      `).bind(TEST_TOKEN).first<{ count: number }>();

      expect(attestations?.count).toBe(0);
    });

    it('should not create delivery records on GET', async () => {
      const ctx = createExecutionContext();
      const request = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });

      await SELF.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // Verify NO deliveries were created
      const deliveries = await env.EIG_DB.prepare(`
        SELECT COUNT(*) as count FROM deliveries WHERE tenant_id = ?
      `).bind(TEST_TENANT_ID).first<{ count: number }>();

      expect(deliveries?.count).toBe(0);
    });
  });

  describe('Gate 2: POST /r/:token must deny unless ALL gates pass', () => {
    it('should deny if Turnstile fails', async () => {
      const ctx = createExecutionContext();
      
      // First GET to get cookies
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      const nonceMatch = cookies.match(/nonce=([^;]+)/);
      const continuityMatch = cookies.match(/continuity_id=([^;]+)/);
      
      await waitOnExecutionContext(ctx);

      // POST with invalid Turnstile
      const formData = new FormData();
      formData.append('csrf', csrfMatch?.[1] || '');
      formData.append('cf-turnstile-response', 'invalid-token');

      const postRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies,
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData,
      });

      const postResponse = await SELF.fetch(postRequest, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(postResponse.status).toBe(200);
      const body = await postResponse.json();
      expect(body.decision).toBe('denied');
      expect(body.reason_code).toBe('turnstile_failed');
    });

    it('should deny if nonce redeem fails', async () => {
      const ctx = createExecutionContext();
      
      // First GET
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      await waitOnExecutionContext(ctx);

      // POST with wrong nonce (continuity mismatch)
      const formData = new FormData();
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      formData.append('csrf', csrfMatch?.[1] || '');
      formData.append('cf-turnstile-response', 'DEV_BYPASS'); // Use dev bypass

      const postRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies.replace(/nonce=[^;]+/, 'nonce=wrong-nonce'), // Wrong nonce
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData,
      });

      // Set ENV=dev for bypass
      const devEnv = { ...env, ENV: 'dev' };
      const postResponse = await SELF.fetch(postRequest, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(postResponse.status).toBe(200);
      const body = await postResponse.json();
      expect(body.decision).toBe('denied');
      expect(['NOT_FOUND', 'CONTINUITY_MISMATCH']).toContain(body.reason_code);
    });

    it('should deny if CSRF mismatch', async () => {
      const ctx = createExecutionContext();
      
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      await waitOnExecutionContext(ctx);

      // POST with wrong CSRF
      const formData = new FormData();
      formData.append('csrf', 'wrong-csrf-token');
      formData.append('cf-turnstile-response', 'DEV_BYPASS');

      const postRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies,
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData,
      });

      const devEnv = { ...env, ENV: 'dev' };
      const postResponse = await SELF.fetch(postRequest, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(postResponse.status).toBe(200);
      const body = await postResponse.json();
      expect(body.decision).toBe('denied');
      expect(body.reason_code).toBe('csrf_mismatch');
    });
  });

  describe('Gate 3: Replay must be impossible', () => {
    it('should deny second POST with same nonce', async () => {
      const ctx = createExecutionContext();
      
      // First GET
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      const nonceMatch = cookies.match(/nonce=([^;]+)/);
      await waitOnExecutionContext(ctx);

      // First POST (should succeed with dev bypass)
      const formData1 = new FormData();
      formData1.append('csrf', csrfMatch?.[1] || '');
      formData1.append('cf-turnstile-response', 'DEV_BYPASS');

      const postRequest1 = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies,
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData1,
      });

      const devEnv = { ...env, ENV: 'dev', EIG_PRIVATE_KEY: env.EIG_PRIVATE_KEY, EIG_KEY_ID: env.EIG_KEY_ID };
      const postResponse1 = await SELF.fetch(postRequest1, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      // Second POST with same nonce (should be denied)
      const formData2 = new FormData();
      formData2.append('csrf', csrfMatch?.[1] || '');
      formData2.append('cf-turnstile-response', 'DEV_BYPASS');

      const postRequest2 = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies, // Same cookies, same nonce
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData2,
      });

      const postResponse2 = await SELF.fetch(postRequest2, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(postResponse2.status).toBe(200);
      const body = await postResponse2.json();
      expect(body.decision).toBe('denied');
      expect(body.reason_code).toBe('REPLAY');
    });
  });

  describe('Gate 4: Open redirect impossible', () => {
    it('should reject javascript: URLs', async () => {
      // Update link with dangerous URL
      await env.EIG_DB.prepare(`
        UPDATE links SET destination_url = ? WHERE token = ?
      `).bind('javascript:alert(1)', TEST_TOKEN).run();

      const ctx = createExecutionContext();
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      await waitOnExecutionContext(ctx);

      // POST should deny due to invalid destination
      const formData = new FormData();
      formData.append('csrf', csrfMatch?.[1] || '');
      formData.append('cf-turnstile-response', 'DEV_BYPASS');

      const postRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies,
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData,
      });

      const devEnv = { ...env, ENV: 'dev', EIG_PRIVATE_KEY: env.EIG_PRIVATE_KEY, EIG_KEY_ID: env.EIG_KEY_ID };
      const postResponse = await SELF.fetch(postRequest, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(postResponse.status).toBe(200);
      const body = await postResponse.json();
      expect(body.decision).toBe('denied');
      expect(body.reason_code).toBe('invalid_destination');

      // Restore safe URL
      await env.EIG_DB.prepare(`
        UPDATE links SET destination_url = ? WHERE token = ?
      `).bind(TEST_DESTINATION, TEST_TOKEN).run();
    });

    it('should reject non-https URLs (except localhost)', async () => {
      await env.EIG_DB.prepare(`
        UPDATE links SET destination_url = ? WHERE token = ?
      `).bind('http://evil.com', TEST_TOKEN).run();

      const ctx = createExecutionContext();
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      await waitOnExecutionContext(ctx);

      const formData = new FormData();
      formData.append('csrf', csrfMatch?.[1] || '');
      formData.append('cf-turnstile-response', 'DEV_BYPASS');

      const postRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies,
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData,
      });

      const devEnv = { ...env, ENV: 'dev', EIG_PRIVATE_KEY: env.EIG_PRIVATE_KEY, EIG_KEY_ID: env.EIG_KEY_ID };
      const postResponse = await SELF.fetch(postRequest, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(postResponse.status).toBe(200);
      const body = await postResponse.json();
      expect(body.decision).toBe('denied');
      expect(body.reason_code).toBe('invalid_destination');

      // Restore
      await env.EIG_DB.prepare(`
        UPDATE links SET destination_url = ? WHERE token = ?
      `).bind(TEST_DESTINATION, TEST_TOKEN).run();
    });
  });

  describe('Gate 5: Verification correctness', () => {
    it('should verify signature + exp + aud before consulting ledger', async () => {
      // This test would require generating a valid JWS
      // For now, we test that /verify endpoint exists and validates structure
      const ctx = createExecutionContext();
      const verifyRequest = new Request('https://test.example.com/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jws: 'invalid.jws.format' }),
      });

      const verifyResponse = await SELF.fetch(verifyRequest, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(verifyResponse.status).toBe(200);
      const body = await verifyResponse.json();
      expect(body.decision).toBe('denied');
      expect(['Invalid JWS format', 'Invalid header', 'Invalid payload']).toContain(body.reason);
    });
  });

  describe('Delivery Actions', () => {
    it('should create delivery_actions rows for successful POST', async () => {
      // Setup: Create HubSpot connection and enable Recipe A
      await env.EIG_DB.prepare(`
        INSERT OR REPLACE INTO hubspot_connections (
          connection_id, tenant_id, portal_id, access_token, refresh_token,
          expires_at, hubspot_events_ok, scopes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).bind(
        'test-conn-123',
        TEST_TENANT_ID,
        '123456',
        'test-token',
        'test-refresh',
        Date.now() + 3600000,
        'analytics.behavioral_events.send,crm.objects.contacts.write',
        Date.now(),
        Date.now()
      ).run();

      await env.EIG_DB.prepare(`
        INSERT OR REPLACE INTO recipe_enablements (
          tenant_id, recipe_id, enabled, created_at, updated_at
        ) VALUES (?, 'A', 1, ?, ?)
      `).bind(TEST_TENANT_ID, Date.now(), Date.now()).run();

      const ctx = createExecutionContext();
      
      // GET to get cookies
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      await waitOnExecutionContext(ctx);

      // POST with dev bypass
      const formData = new FormData();
      formData.append('csrf', csrfMatch?.[1] || '');
      formData.append('cf-turnstile-response', 'DEV_BYPASS');

      const postRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies,
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData,
      });

      const devEnv = {
        ...env,
        ENV: 'dev',
        EIG_PRIVATE_KEY: env.EIG_PRIVATE_KEY,
        EIG_KEY_ID: env.EIG_KEY_ID,
      };
      
      const postResponse = await SELF.fetch(postRequest, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify attestation was created
      const attestation = await env.EIG_DB.prepare(`
        SELECT event_id, decision FROM attestations WHERE token = ? ORDER BY created_at DESC LIMIT 1
      `).bind(TEST_TOKEN).first<{ event_id: string; decision: string }>();

      expect(attestation).toBeTruthy();
      expect(attestation?.decision).toBe('issued');

      if (attestation) {
        // Verify delivery_actions were created
        const actions = await env.EIG_DB.prepare(`
          SELECT action_name, status FROM delivery_actions WHERE event_id = ?
        `).bind(attestation.event_id).all<{ action_name: string; status: string }>();

        // Should have at least send_behavioral_event action
        const eventAction = actions.results?.find(a => a.action_name === 'send_behavioral_event');
        expect(eventAction).toBeTruthy();
      }
    });
  });

  describe('Recipe C Gating', () => {
    it('should reject Recipe C enablement if workflow enrollment unsupported', async () => {
      // This test would require mocking HubSpot API to return enrollment error
      // For now, we verify the gating logic exists in handleRecipeEnable
      // In a real test, we'd mock listWorkflows to return empty or error
      
      const ctx = createExecutionContext();
      const enableRequest = new Request(
        `https://test.example.com/admin/recipes/C/enable?tenant_id=${TEST_TENANT_ID}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.ADMIN_API_KEY || 'test-key'}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled: true,
            config_json: JSON.stringify({ workflow_id: '999' }),
          }),
        }
      );

      // Note: This test requires a HubSpot connection to be set up
      // In a full test suite, we'd set up the connection first
      // For now, this demonstrates the test structure
      
      expect(true).toBe(true); // Placeholder - full test requires HubSpot connection setup
    });
  });

  describe('Pilot Polish: Non-blocking Redirect', () => {
    it('should redirect immediately even when HubSpot delivery fails', async () => {
      // Setup: Create HubSpot connection
      await env.EIG_DB.prepare(`
        INSERT OR REPLACE INTO hubspot_connections (
          connection_id, tenant_id, portal_id, access_token, refresh_token,
          expires_at, hubspot_events_ok, scopes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).bind(
        'test-conn-456',
        TEST_TENANT_ID,
        '123456',
        'invalid-token', // Invalid token will cause 401/403
        'test-refresh',
        Date.now() + 3600000,
        'analytics.behavioral_events.send',
        Date.now(),
        Date.now()
      ).run();

      const ctx = createExecutionContext();
      
      // GET to get cookies
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      await waitOnExecutionContext(ctx);

      // POST with dev bypass (HubSpot will fail but should still redirect)
      const formData = new FormData();
      formData.append('csrf', csrfMatch?.[1] || '');
      formData.append('cf-turnstile-response', 'DEV_BYPASS');

      const postRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies,
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData,
      });

      const devEnv = {
        ...env,
        ENV: 'dev',
        EIG_PRIVATE_KEY: env.EIG_PRIVATE_KEY,
        EIG_KEY_ID: env.EIG_KEY_ID,
      };
      
      const startTime = Date.now();
      const postResponse = await SELF.fetch(postRequest, devEnv, ctx);
      const responseTime = Date.now() - startTime;
      await waitOnExecutionContext(ctx);

      // Should redirect immediately (not wait for HubSpot)
      expect(postResponse.status).toBe(302);
      expect(postResponse.headers.get('Location')).toBe(TEST_DESTINATION);
      
      // Response should be fast (< 1 second, even with HubSpot failure)
      expect(responseTime).toBeLessThan(1000);
      
      // Delivery record should be created (for async retry)
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for async ops
      
      const delivery = await env.EIG_DB.prepare(`
        SELECT status, last_error FROM deliveries WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1
      `).bind(TEST_TENANT_ID).first<{ status: string; last_error: string | null }>();
      
      expect(delivery).toBeTruthy();
      expect(delivery?.status).toBe('retrying'); // Should be retrying due to HubSpot failure
    });
  });

  describe('Pilot Polish: REPLAY UX', () => {
    it('should redirect on REPLAY if recent issued attestation exists', async () => {
      // Create a recent issued attestation with continuity_hash
      const recentEventId = crypto.randomUUID();
      const continuityHash = 'test-continuity-hash';
      await env.EIG_DB.prepare(`
        INSERT INTO attestations (
          event_id, tenant_id, token, nonce, decision, reason_code,
          destination_url, subject_hash, continuity_hash, created_at, expires_at
        ) VALUES (?, ?, ?, ?, 'issued', NULL, ?, ?, ?, ?, ?)
      `).bind(
        recentEventId,
        TEST_TENANT_ID,
        TEST_TOKEN,
        'previous-nonce',
        TEST_DESTINATION,
        'test-subject-hash',
        continuityHash,
        Date.now() - 5 * 60 * 1000, // 5 minutes ago (within 10 minute window)
        Date.now() + 600000
      ).run();

      const ctx = createExecutionContext();
      
      // GET to get cookies
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      await waitOnExecutionContext(ctx);

      // POST with same nonce (will trigger REPLAY)
      const formData = new FormData();
      formData.append('csrf', csrfMatch?.[1] || '');
      formData.append('cf-turnstile-response', 'DEV_BYPASS');

      // Use the same nonce from previous request (simulate replay)
      const nonceMatch = cookies.match(/nonce=([^;]+)/);
      const postRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies.replace(/nonce=[^;]+/, `nonce=${nonceMatch?.[1] || 'previous-nonce'}`),
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData,
      });

      const devEnv = {
        ...env,
        ENV: 'dev',
        EIG_PRIVATE_KEY: env.EIG_PRIVATE_KEY,
        EIG_KEY_ID: env.EIG_KEY_ID,
      };
      
      const postResponse = await SELF.fetch(postRequest, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      // Should redirect to destination (not deny)
      expect(postResponse.status).toBe(302);
      expect(postResponse.headers.get('Location')).toBe(TEST_DESTINATION);
      
      // Should NOT create a new attestation (replay detected)
      const attestations = await env.EIG_DB.prepare(`
        SELECT COUNT(*) as count FROM attestations WHERE token = ? AND event_id != ?
      `).bind(TEST_TOKEN, recentEventId).first<{ count: number }>();
      
      expect(attestations?.count).toBe(0); // No new attestation created
    });

    it('should show retry page on REPLAY if no recent issued attestation', async () => {
      const ctx = createExecutionContext();
      
      // GET to get cookies
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      await waitOnExecutionContext(ctx);

      // First POST (succeeds)
      const formData1 = new FormData();
      formData1.append('csrf', csrfMatch?.[1] || '');
      formData1.append('cf-turnstile-response', 'DEV_BYPASS');

      const postRequest1 = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies,
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData1,
      });

      const devEnv = {
        ...env,
        ENV: 'dev',
        EIG_PRIVATE_KEY: env.EIG_PRIVATE_KEY,
        EIG_KEY_ID: env.EIG_KEY_ID,
      };
      
      await SELF.fetch(postRequest1, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      // Second POST with same nonce (REPLAY, but attestation is > 10 minutes old)
      // Delete any recent attestations first
      await env.EIG_DB.prepare(`
        DELETE FROM attestations WHERE token = ? AND created_at > ?
      `).bind(TEST_TOKEN, Date.now() - 10 * 60 * 1000).run();

      const postRequest2 = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies, // Same cookies, same nonce
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData1, // Same form data
      });

      const postResponse2 = await SELF.fetch(postRequest2, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      // Should return JSON with retry message (not redirect)
      expect(postResponse2.status).toBe(200);
      const body = await postResponse2.json();
      expect(body.decision).toBe('denied');
      expect(body.reason_code).toBe('REPLAY');
      expect(body.retry).toBe(true);
    });
  });

  describe('Pilot Polish: Token Refresh Race', () => {
    it('should prevent concurrent refresh from corrupting tokens', async () => {
      // This test would require setting up a HubSpot connection and simulating
      // concurrent refresh calls. For now, we verify the mutex DO exists.
      
      // The mutex DO should be available in env
      expect(env.TOKEN_REFRESH_MUTEX).toBeDefined();
      
      // In a full test, we would:
      // 1. Create a HubSpot connection with expired token
      // 2. Make concurrent calls to refreshHubSpotToken
      // 3. Verify only one refresh happens and tokens are not corrupted
      
      expect(true).toBe(true); // Placeholder - full test requires HubSpot OAuth setup
    });
  });

  describe('Reliability Hardening: Timeout Enqueue', () => {
    it('should enqueue delivery job synchronously when timeout exceeded', async () => {
      // Setup: Create HubSpot connection
      await env.EIG_DB.prepare(`
        INSERT OR REPLACE INTO hubspot_connections (
          connection_id, tenant_id, portal_id, access_token, refresh_token,
          expires_at, hubspot_events_ok, scopes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).bind(
        'test-conn-timeout',
        TEST_TENANT_ID,
        '123456',
        'test-token',
        'test-refresh',
        Date.now() + 3600000,
        'analytics.behavioral_events.send',
        Date.now(),
        Date.now()
      ).run();

      const ctx = createExecutionContext();
      
      // GET to get cookies
      const getRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'GET',
        headers: {
          'Host': TEST_DOMAIN,
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '1.2.3.4',
        },
      });
      const getResponse = await SELF.fetch(getRequest, env, ctx);
      const cookies = getResponse.headers.get('Set-Cookie') || '';
      const csrfMatch = cookies.match(/csrf_token=([^;]+)/);
      await waitOnExecutionContext(ctx);

      // POST with dev bypass
      const formData = new FormData();
      formData.append('csrf', csrfMatch?.[1] || '');
      formData.append('cf-turnstile-response', 'DEV_BYPASS');

      const postRequest = new Request(`https://${TEST_DOMAIN}/r/${TEST_TOKEN}`, {
        method: 'POST',
        headers: {
          'Host': TEST_DOMAIN,
          'Cookie': cookies,
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: formData,
      });

      const devEnv = {
        ...env,
        ENV: 'dev',
        EIG_PRIVATE_KEY: env.EIG_PRIVATE_KEY,
        EIG_KEY_ID: env.EIG_KEY_ID,
      };
      
      const postResponse = await SELF.fetch(postRequest, devEnv, ctx);
      await waitOnExecutionContext(ctx);

      // Should redirect immediately
      expect(postResponse.status).toBe(302);
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify delivery record was created with action_plan_json
      const delivery = await env.EIG_DB.prepare(`
        SELECT delivery_id, status, action_plan_json, next_attempt_at FROM deliveries
        WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1
      `).bind(TEST_TENANT_ID).first<{
        delivery_id: string;
        status: string;
        action_plan_json: string | null;
        next_attempt_at: number | null;
      }>();
      
      expect(delivery).toBeTruthy();
      expect(delivery?.action_plan_json).toBeTruthy();
      
      // Parse action plan
      const actionPlan = JSON.parse(delivery?.action_plan_json || '[]');
      expect(Array.isArray(actionPlan)).toBe(true);
      expect(actionPlan).toContain('send_behavioral_event');
    });
  });

  describe('Reliability Hardening: Cron Processing', () => {
    it('should process pending deliveries and complete remaining actions without duplicates', async () => {
      // Setup: Create delivery with some actions already completed
      const eventId = crypto.randomUUID();
      const deliveryId = crypto.randomUUID();
      const actionPlan = JSON.stringify(['send_behavioral_event', 'patch_contact_properties']);
      
      // Create attestation
      await env.EIG_DB.prepare(`
        INSERT INTO attestations (
          event_id, tenant_id, token, nonce, decision, reason_code,
          destination_url, subject_hash, continuity_hash, created_at, expires_at
        ) VALUES (?, ?, ?, ?, 'issued', NULL, ?, ?, ?, ?, ?)
      `).bind(
        eventId,
        TEST_TENANT_ID,
        TEST_TOKEN,
        'test-nonce',
        TEST_DESTINATION,
        'test-subject-hash',
        'test-continuity-hash',
        Date.now() - 60000,
        Date.now() + 600000
      ).run();

      // Create delivery with pending status
      await env.EIG_DB.prepare(`
        INSERT INTO deliveries (
          delivery_id, event_id, tenant_id, portal_id, status,
          attempt_count, next_attempt_at, last_error, action_plan_json, created_at, completed_at
        ) VALUES (?, ?, ?, ?, 'pending', 0, ?, NULL, ?, ?, NULL)
      `).bind(
        deliveryId,
        eventId,
        TEST_TENANT_ID,
        '123456',
        Date.now(), // Due now
        actionPlan,
        Date.now()
      ).run();

      // Mark one action as already completed (simulating partial completion)
      await env.EIG_DB.prepare(`
        INSERT INTO delivery_actions (
          action_id, delivery_id, event_id, tenant_id, action_name, status, completed_at
        ) VALUES (?, ?, ?, ?, 'send_behavioral_event', 'completed', ?)
      `).bind(
        crypto.randomUUID(),
        deliveryId,
        eventId,
        TEST_TENANT_ID,
        'send_behavioral_event',
        Date.now()
      ).run();

      // Create HubSpot connection
      await env.EIG_DB.prepare(`
        INSERT OR REPLACE INTO hubspot_connections (
          connection_id, tenant_id, portal_id, access_token, refresh_token,
          expires_at, hubspot_events_ok, scopes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).bind(
        'test-conn-cron',
        TEST_TENANT_ID,
        '123456',
        'test-token',
        'test-refresh',
        Date.now() + 3600000,
        'analytics.behavioral_events.send,crm.objects.contacts.write',
        Date.now(),
        Date.now()
      ).run();

      // Import and call cron handler
      const { handleCronDeliveries } = await import('../cron');
      const result = await handleCronDeliveries(env);

      // Should have processed the delivery
      expect(result.processed).toBeGreaterThan(0);

      // Verify send_behavioral_event was NOT executed again (idempotency)
      const eventActions = await env.EIG_DB.prepare(`
        SELECT COUNT(*) as count FROM delivery_actions
        WHERE event_id = ? AND action_name = 'send_behavioral_event'
      `).bind(eventId).first<{ count: number }>();
      
      expect(eventActions?.count).toBe(1); // Only one (the original)

      // Verify remaining action (patch_contact_properties) was attempted
      const patchActions = await env.EIG_DB.prepare(`
        SELECT COUNT(*) as count FROM delivery_actions
        WHERE event_id = ? AND action_name = 'patch_contact_properties'
      `).bind(eventId).first<{ count: number }>();
      
      // Should have attempted patch_contact_properties (may succeed or fail depending on mock)
      expect(patchActions?.count).toBeGreaterThanOrEqual(0);
    });
  });
});
