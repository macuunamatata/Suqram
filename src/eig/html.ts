// HTML generation for interstitial pages

export type PolicyTemplate = 'low_friction' | 'b2b_corporate' | 'high_sensitivity';

export interface PolicyConfig {
  require_confirm: boolean;
  turnstile: 'invisible' | 'challenge';
  nonce_ttl: number; // milliseconds
}

export const POLICY_TEMPLATES: Record<PolicyTemplate, PolicyConfig> = {
  low_friction: {
    require_confirm: false,
    turnstile: 'invisible',
    nonce_ttl: 5 * 60 * 1000, // 5 minutes
  },
  b2b_corporate: {
    require_confirm: false,
    turnstile: 'challenge',
    nonce_ttl: 10 * 60 * 1000, // 10 minutes
  },
  high_sensitivity: {
    require_confirm: true,
    turnstile: 'challenge',
    nonce_ttl: 10 * 60 * 1000, // 10 minutes
  },
};

/**
 * Generate interstitial HTML page
 */
export function generateInterstitialHTML(
  token: string,
  policy: PolicyTemplate,
  turnstileSiteKey: string,
  csrfToken: string,
  nonce: string
): string {
  const config = POLICY_TEMPLATES[policy];

  const turnstileMode = config.turnstile === 'invisible' ? 'invisible' : 'interactive';
  const showConfirmButton = config.require_confirm;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifying...</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .confirm-button {
      margin-top: 1rem;
      padding: 12px 24px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      display: ${showConfirmButton ? 'inline-block' : 'none'};
    }
    .confirm-button:hover {
      background: #2980b9;
    }
    .turnstile-container {
      margin: 1rem 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Verifying your request...</h2>
    <p>Please wait while we verify your identity.</p>
    <div class="turnstile-container" id="turnstile-container"></div>
    <button class="confirm-button" id="confirm-btn" style="display: ${showConfirmButton ? 'block' : 'none'}">
      Continue
    </button>
  </div>
  <script>
    const token = ${JSON.stringify(token)};
    const turnstileSiteKey = ${JSON.stringify(turnstileSiteKey)};
    const csrfToken = ${JSON.stringify(csrfToken)};
    const nonce = ${JSON.stringify(nonce)};
    const turnstileMode = ${JSON.stringify(turnstileMode)};
    const requireConfirm = ${showConfirmButton};

    let turnstileWidgetId = null;
    let turnstileToken = null;

    function submitForm() {
      if (!turnstileToken) {
        console.error('Turnstile token not ready');
        return;
      }

      // Create form with CSRF token and Turnstile response
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/r/' + token;

      const csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = 'csrf';
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);

      const turnstileInput = document.createElement('input');
      turnstileInput.type = 'hidden';
      turnstileInput.name = 'cf-turnstile-response';
      turnstileInput.value = turnstileToken;
      form.appendChild(turnstileInput);

      // Add CSRF header via hidden input (will be read as X-CSRF header)
      // Note: Browsers don't allow setting custom headers on form submit
      // So we'll validate CSRF from form data and cookie match
      document.body.appendChild(form);
      
      // Submit form
      form.submit();
    }

    function initTurnstile() {
      if (turnstileMode === 'invisible') {
        // Invisible Turnstile - auto-submit on success
        turnstileWidgetId = turnstile.render('#turnstile-container', {
          sitekey: turnstileSiteKey,
          callback: function(token) {
            turnstileToken = token;
            if (!requireConfirm) {
              submitForm();
            }
          },
          'error-callback': function() {
            console.error('Turnstile error');
          },
          size: 'invisible',
        });
      } else {
        // Challenge Turnstile - show widget, submit on success or button click
        turnstileWidgetId = turnstile.render('#turnstile-container', {
          sitekey: turnstileSiteKey,
          callback: function(token) {
            turnstileToken = token;
            if (!requireConfirm) {
              submitForm();
            } else {
              document.getElementById('confirm-btn').style.display = 'block';
            }
          },
          'error-callback': function() {
            console.error('Turnstile error');
          },
        });
      }
    }

    // Initialize on load
    if (typeof turnstile !== 'undefined') {
      initTurnstile();
    } else {
      window.addEventListener('load', function() {
        if (typeof turnstile !== 'undefined') {
          initTurnstile();
        }
      });
    }

    // Confirm button handler
    if (requireConfirm) {
      document.getElementById('confirm-btn').addEventListener('click', function() {
        if (turnstileToken) {
          submitForm();
        }
      });
    }
  </script>
</body>
</html>`;
}
