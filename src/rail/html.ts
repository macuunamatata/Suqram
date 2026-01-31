// Rail interstitial: human-only. Real <form method="POST"> so browser sends cookies to /r/:rid/confirm.

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
    .btn:hover:not(:disabled) { background: #555; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .msg { margin-bottom: 1rem; color: #444; }
    .err { color: #c00; font-size: 0.9rem; margin-top: 0.5rem; display: none; }
  </style>
</head>
<body>
  <div class="box">
    <p class="msg">You're about to leave this link.</p>
    <form id="railConfirm" method="POST" action="${confirmPath}">
      <input type="hidden" name="csrf" value="${csrfToken.replace(/"/g, '&quot;')}">
      <input type="hidden" name="u" id="rail_u" value="">
      <button type="submit" class="btn" id="rail_btn">Continue</button>
    </form>
    <p class="err" id="rail_err">Missing destination</p>
  </div>
  <script>
    (function() {
      var hash = (window.location.hash || '').replace(/^#/, '');
      var u = '';
      if (hash) {
        if (hash.indexOf('u=') === 0) u = hash.slice(2); else u = hash;
        try { u = decodeURIComponent(u); } catch (e) { u = ''; }
      }
      var inputU = document.getElementById('rail_u');
      var btn = document.getElementById('rail_btn');
      var err = document.getElementById('rail_err');
      inputU.value = u;
      if (!u) {
        btn.disabled = true;
        err.style.display = 'block';
      }
      document.getElementById('railConfirm').onsubmit = function() {
        if (!inputU.value) { err.style.display = 'block'; return false; }
        return true;
      };
    })();
  </script>
</body>
</html>`;
}

/** GET /r/:rid/confirm — 405 with message and link back to /r/:rid */
export function generateConfirmGetErrorHTML(rid: string): string {
  const backPath = `/r/${rid}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Method not allowed</title></head>
<body style="font-family:system-ui;padding:2rem;text-align:center">
  <h1>405 Method Not Allowed</h1>
  <p>Use the Continue button on the link page.</p>
  <p><a href="${backPath}">Back to link</a></p>
</body>
</html>`;
}

/** Diagnostics for confirm errors (HTML comments, not visible) */
export interface ConfirmErrorDiagnostics {
  hasContinuityCookie: boolean;
  hasCsrfCookie: boolean;
  hasCsrfBody: boolean;
  hasUBody: boolean;
}

/** Styled error for confirm (CSRF/continuity failure) with link back to /r/:rid */
export function generateConfirmErrorHTML(rid: string, message: string, diag?: ConfirmErrorDiagnostics): string {
  const backPath = `/r/${rid}`;
  const comment =
    diag != null
      ? `\n<!-- confirm diag: hasContinuityCookie=${diag.hasContinuityCookie} hasCsrfCookie=${diag.hasCsrfCookie} hasCsrfBody=${diag.hasCsrfBody} hasUBody=${diag.hasUBody} -->\n`
      : '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Error</title>
<style>body{font-family:system-ui;padding:2rem;max-width:32rem;margin:0 auto;color:#333}a{color:#0066cc}</style>
</head>
<body>${comment}
  <h1>Something went wrong</h1>
  <p>${escapeHtml(message)}</p>
  <p><a href="${backPath}">Back to link</a> — then click Continue again.</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @deprecated Use generateRailInterstitialHTML for scanner-safe rail. Kept for any legacy callers. */
export function generateRailBootloaderHTML(nonce: string, csrfToken: string, rid: string): string {
  return generateRailInterstitialHTML(rid, csrfToken);
}
