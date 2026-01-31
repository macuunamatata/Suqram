// Rail interstitial: human-only. No meta refresh, no auto-redirect, no JS auto-submit.
// Single "Continue" button; on click POSTs to /r/:rid/confirm with u= and csrf from fragment.

export function generateRailInterstitialHTML(rid: string, csrfToken: string): string {
  const confirmPath = `/r/${rid}/confirm`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Continue</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .box { text-align: center; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .btn { display: inline-block; padding: 0.6rem 1.2rem; background: #333; color: #fff; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; }
    .btn:hover { background: #555; }
    .msg { margin-bottom: 1rem; color: #444; }
  </style>
</head>
<body>
  <div class="box">
    <p class="msg">You're about to leave this link.</p>
    <button type="button" class="btn" id="continue-btn">Continue</button>
  </div>
  <script>
    (function() {
      var confirmPath = ${JSON.stringify(confirmPath)};
      var csrfToken = ${JSON.stringify(csrfToken)};
      var hash = (window.location.hash || '').replace(/^#/, '');
      var u = '';
      if (hash) {
        if (hash.indexOf('u=') === 0) u = hash.slice(2); else u = hash;
        try { u = decodeURIComponent(u); } catch (e) { u = ''; }
      }
      document.getElementById('continue-btn').onclick = function() {
        if (!u) { alert('Missing destination'); return; }
        var form = document.createElement('form');
        form.method = 'POST';
        form.action = confirmPath;
        form.style.display = 'none';
        var inputU = document.createElement('input');
        inputU.name = 'u';
        inputU.value = u;
        form.appendChild(inputU);
        var inputCsrf = document.createElement('input');
        inputCsrf.name = 'csrf';
        inputCsrf.value = csrfToken;
        form.appendChild(inputCsrf);
        document.body.appendChild(form);
        form.submit();
      };
    })();
  </script>
</body>
</html>`;
}

/** @deprecated Use generateRailInterstitialHTML for scanner-safe rail. Kept for any legacy callers. */
export function generateRailBootloaderHTML(nonce: string, csrfToken: string, rid: string): string {
  return generateRailInterstitialHTML(rid, csrfToken);
}
