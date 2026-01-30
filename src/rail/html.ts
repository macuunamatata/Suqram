// Rail bootloader HTML: reads fragment, auto-POSTs to /redeem, one-click redirect (no Turnstile, no Continue button)

export function generateRailBootloaderHTML(nonce: string, csrfToken: string, rid: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .box { text-align: center; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .spinner { width: 32px; height: 32px; border: 3px solid #eee; border-top-color: #333; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fallback { margin-top: 1rem; }
    .fallback a { color: #0066cc; }
  </style>
</head>
<body>
  <div class="container box">
    <div class="spinner"></div>
    <p>Redirecting...</p>
    <div class="fallback" id="fallback" style="display:none;">
      <p>If you are not redirected, <a href="#" id="continue-link">click here</a>.</p>
    </div>
  </div>
  <script>
    (function() {
      var nonce = ${JSON.stringify(nonce)};
      var csrfToken = ${JSON.stringify(csrfToken)};
      var rid = ${JSON.stringify(rid)};
      var hash = (window.location.hash || '').replace(/^#/, '');
      var u = '';
      if (hash) {
        if (hash.indexOf('u=') === 0) u = hash.slice(2); else u = hash;
        try { u = decodeURIComponent(u); } catch (e) { u = ''; }
      }

      function showFallback() {
        var el = document.getElementById('fallback');
        if (el) el.style.display = 'block';
      }

      function doRedeem(payloadU) {
        var body = new URLSearchParams();
        body.append('nonce', nonce);
        body.append('rid', rid);
        body.append('u', payloadU);
        body.append('csrf', csrfToken);
        fetch('/redeem', {
          method: 'POST',
          headers: { 'X-CSRF': csrfToken, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          credentials: 'same-origin'
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (data.ok && data.redirect_to) {
            window.location.replace(data.redirect_to);
          } else {
            showFallback();
          }
        }).catch(function() { showFallback(); });
      }

      if (u) {
        doRedeem(u);
      } else {
        showFallback();
        var link = document.getElementById('continue-link');
        if (link) {
          link.href = '#';
          link.onclick = function(e) {
            e.preventDefault();
            var promptU = window.prompt('Paste the full link you received by email (or the destination URL):');
            if (promptU) doRedeem(promptU.trim());
          };
        }
      }
    })();
  </script>
</body>
</html>`;
}
