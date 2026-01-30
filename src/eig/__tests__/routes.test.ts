// Unit tests for EIG routes (using miniflare)
// Note: These tests would need miniflare setup
// For now, this is a skeleton structure
// To run tests, install vitest: npm install -D vitest

describe('EIG Routes', () => {
  describe('GET /r/:token', () => {
    it('should not mint attestation on GET', async () => {
      // Test that GET /r/:token never calls HubSpot or mints attestation
      // Verify no ledger entries created
      // Verify only nonce is issued
    });

    it('should create continuity cookie on GET', async () => {
      // Test that continuity_id cookie is set
      // Test SameSite=Lax
    });

    it('should create CSRF cookie on GET', async () => {
      // Test that csrf_token cookie is set
      // Test HttpOnly flag
    });

    it('should request nonce from DO', async () => {
      // Test that IntentNonceDO.issue is called
      // Test nonce is stored in cookie
    });

    it('should render interstitial HTML', async () => {
      // Test HTML contains Turnstile widget
      // Test policy template affects HTML (low_friction vs high_sensitivity)
    });
  });

  describe('POST /r/:token', () => {
    it('should deny if continuity cookie missing', async () => {
      // Test returns { decision: 'denied', reason_code: 'missing_continuity' }
    });

    it('should deny if CSRF mismatch', async () => {
      // Test returns { decision: 'denied', reason_code: 'csrf_mismatch' }
    });

    it('should deny if Turnstile invalid', async () => {
      // Test returns { decision: 'denied', reason_code: 'turnstile_failed' }
      // Mock Turnstile verification to return false
    });

    it('should deny if nonce replay', async () => {
      // Test that redeeming same nonce twice returns REPLAY error
      // Test ledger shows denied with reason_code='REPLAY'
    });

    it('should deny if nonce expired', async () => {
      // Test that expired nonce returns EXPIRED error
    });

    it('should mint attestation on valid POST', async () => {
      // Test that valid POST:
      // 1. Redeems nonce successfully
      // 2. Creates ledger row with decision='issued'
      // 3. Signs JWT with Ed25519
      // 4. Returns 302 redirect to destination_url
      // 5. Calls HubSpot delivery (if connection exists)
    });

    it('should prevent open redirect', async () => {
      // Test that destination_url only comes from D1 links table
      // Test that querystring destinations are ignored
    });

    it('should write ledger row for issued attestation', async () => {
      // Test attestations table has row with:
      // - decision='issued'
      // - reason_code=null
      // - event_id matches jti in JWT
    });

    it('should write ledger row for denied attestation', async () => {
      // Test attestations table has row with:
      // - decision='denied'
      // - reason_code set (e.g., 'turnstile_failed')
    });
  });
});
