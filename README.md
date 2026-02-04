# Auth Link Scanner Immunity Rail

**One lane. One outcome:** Password reset / magic links / invite links cannot be consumed by email security scanners. User clicks once and it works. Scanners can fetch but never redeem.

Set-and-forget. No analytics dashboards. Deterministic only.

---

## 60-second mental model

1. **Fragment hides the token.** The real destination URL (e.g. Supabase `ConfirmationURL`) lives only in the **URL fragment** (`#u=...`). Scanners and prefetchers get the page **without** the fragment; the server never sees the token on GET.
2. **GET is always safe.** `GET /r/:rid` returns HTML + sets cookies + issues a **permit** (nonce) from a Durable Object. It **never** redeems or forwards anywhere.
3. **Only POST redeem spends.** The browser reads the fragment, POSTs to `/redeem` with the destination in the body. The server validates cookies, CSRF, and nonce, redeems the permit **exactly once**, then returns `{ ok: true, redirect_to: dst }`. Client does `location.replace(dst)`.
4. **Scanners lose.** They GET the page (no fragment), get a fresh nonce each time, and never have the real destination to send in POST. So they can never redeem the one-time token.

---

## 5-minute local run

**Prerequisites:** Node.js 18+, [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm i -g wrangler` or `npx wrangler`).

```bash
# 1. Install
npm install

# 2. Apply schema (first time only)
wrangler d1 execute EIG_DB --file=sql/schema.sql --local -c worker/wrangler.toml

# 3. Terminal 1: start dev server
npm run dev
# → http://127.0.0.1:8787

# 4. Terminal 2: smoke test
npm run smoke
```

All 7 checks should pass (health, scanner loop, simulated human, replay). **Local only:** copy `.dev.vars.example` to `.dev.vars` so `ALLOWED_DEST_HOSTS=example.com` is set for smoke (wrangler dev loads `.dev.vars`). No seed or Cloudflare login needed for local.

---

## Deployment

- **suqram.com** is **Cloudflare Pages**: deployed on git push to the connected branch. In the Pages project set **Root directory** = `site`, **Build output directory** = `out`, **Build command** = `npm run build` (run from the `site` root by Pages).
- **go.suqram.com** is a **Cloudflare Worker**: deployed via `npm run deploy:prod`.

### Before using /live-test simulate

The simulate demo ([/live-test](https://suqram.com/live-test)) needs extra D1 columns. Run the migration once (remote or local):

```bash
npm run migrate:d1:remote
```

For local dev with D1: `npm run migrate:d1:local`.

---

## Production setup (go.suqram.com)

**Rail:** `https://go.suqram.com` · **Marketing:** `https://suqram.com` (or www)

### Binding the rail domain (go.suqram.com)

Use either:

1. **Wrangler routes (already in repo):** `worker/wrangler.toml` includes a route for `go.suqram.com/*` on zone `suqram.com`. After deploy, ensure the zone is active in your Cloudflare account so the route applies.
2. **Cloudflare Dashboard:** Workers & Pages → your Worker → Settings → Domains & Routes → Add Custom Domain → `go.suqram.com` (zone must be suqram.com).

### Required production env

Set these via **Cloudflare Secrets** (not in `worker/wrangler.toml`):

- **`ALLOWED_DEST_HOSTS`** — Comma-separated hosts the rail may redirect to (e.g. your Supabase project + app host). Example: `yourproject.supabase.co,app.suqram.com`
- **`ALLOWED_DEST_HOST_SUFFIXES`** (optional) — Comma-separated host suffixes, e.g. `.supabase.co`
- **`SYNC_USER_SECRET`** (optional) — Shared secret so the marketing site can sync user records to D1 after Google login; same value as the site’s `SYNC_USER_SECRET`

```bash
wrangler secret put ALLOWED_DEST_HOSTS
# Enter value when prompted (e.g. yourproject.supabase.co,app.suqram.com)
wrangler secret put ALLOWED_DEST_HOST_SUFFIXES   # optional
```

**Do not set `ALLOWED_PRIVATE_IP=1` in production.** That would allow redirects to private IP ranges and is only for local/dev.

### Test destination (no Supabase yet)

Use a test destination host on suqram.com so you can try the full flow (go.suqram.com → destination) without Supabase.

1. **Create the test host in Cloudflare DNS**  
   **Cloudflare Dashboard** → **Websites** → **suqram.com** → **DNS** → **Records** → **Add record**  
   - Type: **CNAME**  
   - Name: **app** (or **test**)  
   - Target: **example.com** (or your Pages project URL, e.g. `your-pages.pages.dev`)  
   - Proxy status: Proxied or DNS only, your choice  
   - Save  

   You now have **app.suqram.com** (or **test.suqram.com**) pointing somewhere that serves HTTPS.

2. **Allowlist it in the worker**  
   Set the worker secret so the rail can redirect to that host:
   ```bash
   wrangler secret put ALLOWED_DEST_HOSTS
   # Enter: app.suqram.com
   ```
   (If you already have other hosts, use a comma-separated list: `app.suqram.com,yourproject.supabase.co`.)

3. **Deploy the worker**  
   ```bash
   npm run deploy
   ```

4. **Test end-to-end**  
   - Open **https://suqram.com/start/**  
   - In “Destination URL” enter **https://app.suqram.com** (or https://app.suqram.com/success)  
   - Copy the generated protected link, open it in a browser  
   - You should land on the test destination after one click  

**Optional:** To host a minimal page at app.suqram.com: **Cloudflare Dashboard** → **Workers & Pages** → **Create** → **Pages** → connect a repo or upload a static “Success” page, then add **Custom domain** **app.suqram.com** in the Pages project. Use that Pages URL as the CNAME target in step 1 if you prefer your own page over example.com.

---

## 15-minute production setup

1. **CNAME:** Point your rail domain to the Worker (e.g. `links.yourdomain.com` → `your-worker.workers.dev`).
2. **D1:** Create DB, apply schema, set `database_id` in `worker/wrangler.toml`:
   ```bash
   wrangler d1 create eig-db
   wrangler d1 execute eig-db --file=sql/schema.sql --remote -c worker/wrangler.toml
   ```
3. **Secrets / vars (minimal):**  
   - Set **allowed destination hosts** so the rail only redirects to your app (see [Allowed destination hosts](#allowed-destination-hosts) below).  
   - Optional: `ADMIN_API_KEY` if you use admin endpoints.
4. **Deploy:**
   ```bash
   npm run deploy
   ```
5. **Smoke (remote):** `WORKER_URL=https://links.yourdomain.com npm run smoke -- --remote`

---

## Supabase integration (copy-paste)

Keep the **upstream URL only in the fragment**. Generate the rail link **server-side** when sending the email; never put the raw Supabase URL in the template.

**Helper script (no deps):**
```bash
node scripts/encode-fragment.mjs "https://YOUR_PROJECT.supabase.co/auth/v1/verify?token=TOKEN&type=recovery"
# Outputs rail link + Supabase snippet. Set RAIL_BASE_URL to your rail domain.
```

### a) Magic Link

In **Authentication → Email Templates → Magic Link**, replace the link in the body with a rail link. Generate it when sending (e.g. in a hook or Edge Function):

```javascript
const rid = crypto.randomUUID();
const destination = `${process.env.SUPABASE_URL}/auth/v1/verify?token=${token}&type=magiclink`;
const railLink = `${process.env.RAIL_BASE_URL}/r/${rid}#u=${encodeURIComponent(destination)}`;
// Use railLink in the email body (e.g. replace {{ .ConfirmationURL }} with this).
```

### b) Invite

Same idea: build the invite URL (e.g. Supabase invite link or your app’s invite URL), then wrap it in the rail:

```javascript
const rid = crypto.randomUUID();
const destination = `https://yourapp.com/invite?token=${inviteToken}`; // or Supabase invite URL
const railLink = `${process.env.RAIL_BASE_URL}/r/${rid}#u=${encodeURIComponent(destination)}`;
```

### c) Password Reset

In **Authentication → Email Templates → Reset Password**, use a rail link instead of the raw confirmation URL:

```javascript
const rid = crypto.randomUUID();
const destination = `${process.env.SUPABASE_URL}/auth/v1/verify?token=${token}&type=recovery`;
const railLink = `${process.env.RAIL_BASE_URL}/r/${rid}#u=${encodeURIComponent(destination)}`;
// Put railLink in the template where you’d normally use {{ .ConfirmationURL }}.
```

**Required:** Add your Supabase project host (and app host if different) to the rail’s [allowed destination hosts](#allowed-destination-hosts).

---

## Allowed destination hosts

The rail only redirects to hosts you allow. No allowlist = only localhost is allowed (for dev).

**Two ways to allow:**

1. **Exact hosts** – `ALLOWED_DEST_HOSTS` (comma-separated).  
   Example: Supabase project + your app host.
2. **Suffix** – `ALLOWED_DEST_HOST_SUFFIXES` (comma-separated).  
   Example: `.supabase.co,.vercel.app`.

**Examples:**

- **Supabase project host:**  
  `ALLOWED_DEST_HOSTS=abcdefghijk.supabase.co`  
  (use your project ref from the Supabase URL)
- **App host:**  
  `ALLOWED_DEST_HOSTS=myapp.vercel.app`  
  or use suffix: `ALLOWED_DEST_HOST_SUFFIXES=.vercel.app`

Set in **worker/wrangler.toml** `[vars]` or **Secrets** (production):

```toml
# worker/wrangler.toml [vars] – example
ALLOWED_DEST_HOSTS = "abcdefghijk.supabase.co,myapp.vercel.app"
# or
ALLOWED_DEST_HOST_SUFFIXES = ".supabase.co,.vercel.app"
```

Rules: `javascript:` and `data:` are always blocked. Private IPs are blocked unless you set `ALLOWED_PRIVATE_IP=1` (e.g. dev). Localhost is always allowed for local dev.

---

## Troubleshooting

| Issue | Cause | What to do |
|-------|--------|------------|
| **Missing fragment** | User opened a link without `#u=...` (e.g. copied without hash, or scanner stripped it). | Fallback UI shows “paste the link” / “click here”. User can paste the full email link or destination; JS will POST `u` and redirect. |
| **JS blocked** | No JavaScript (strict CSP, old client). | Same fallback: user can click and paste the destination URL. No automatic one-click in that session. |
| **Allowlist failure** | Destination host not in `ALLOWED_DEST_HOSTS` or `ALLOWED_DEST_HOST_SUFFIXES`. | Response: `{ ok: false, reason: "invalid_destination" }`. Add the destination host (e.g. `xxx.supabase.co` or your app host) to the allowlist. |
| **Replay** | Same nonce used twice (double-click, back button, or scanner replay). | Second request returns `{ ok: false, reason: "REPLAY" }`. User should use the link once; if already used, request a new email/link. |
| **Expired** | Permit (nonce) TTL exceeded (default 5 min). | Response: `{ ok: false, reason: "EXPIRED" }`. User should request a new link. |

---

## Real Inbox Test

Prove the rail works in a real mailbox with real corporate scanners. The marketing site sends a test email with a **protected link** (go.suqram.com rail) and a **control link** (unprotected). Scanners can consume the control link; the protected link works when you click.

### Setup

1. **Worker secrets** (production only):
   ```bash
   wrangler secret put RESEND_API_KEY   # Resend API key (https://resend.com)
   wrangler secret put TEST_FROM_EMAIL  # From address (e.g. noreply@suqram.com)
   ```
2. **Allowed destinations:** Add **suqram.com** so the protected link can redirect to the result page:
   ```bash
   wrangler secret put ALLOWED_DEST_HOSTS
   # Enter e.g. suqram.com,yourproject.supabase.co (include suqram.com for the test)
   ```
3. **D1:** Apply schema (includes `live_tests` and `live_test_events`):
   ```bash
   wrangler d1 execute EIG_DB --file=sql/schema.sql --remote -c worker/wrangler.toml
   ```

### How to run

1. Open **https://suqram.com/live-test**
2. Enter your email and click **Send test email**
3. Check your inbox (use a corporate inbox if possible — Outlook, Defender)
4. Click the **protected link** first — you should land on “Protected link worked”
5. Click the **control link** — if a scanner already hit it, you’ll see “Control link already used”; otherwise “Control link worked (first click)”

No dashboards. No fake tests. Real email, real scanner behavior.

---

## Demo mode (no Supabase)

Locally, `https://example.com` is allowed so you can try the flow without Supabase.

**1. Start dev server:** `npm run dev`

**2. GET the rail page (get cookies + nonce):**
```bash
curl -s -c cookies.txt -b cookies.txt "http://127.0.0.1:8787/r/demo-rid-1"
```
Save the response HTML; extract `nonce` and `csrfToken` from the script (e.g. `var nonce = "..."` and `var csrfToken = "..."`).

**3. POST redeem (fragments don’t go over HTTP, so send `u` in body):**
```bash
curl -s -b cookies.txt -X POST "http://127.0.0.1:8787/redeem" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-CSRF: YOUR_CSRF_TOKEN" \
  -d "nonce=YOUR_NONCE&rid=demo-rid-1&u=https%3A%2F%2Fexample.com%2Fsuccess&csrf=YOUR_CSRF_TOKEN"
```
Replace `YOUR_NONCE` and `YOUR_CSRF_TOKEN` with values from step 2. Expected: `{"ok":true,"redirect_to":"https://example.com/success"}`.

**4. Smoke test (automates GET + POST with same encoding):** `npm run smoke`

---

## Public endpoints

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/r/:rid` | Safe. Returns HTML bootloader; sets cookies; issues permit. **Never redeems.** |
| POST | `/redeem` | Only spend path. Validates cookies, CSRF, nonce, `u`. Returns `{ ok, redirect_to? }` or `{ ok: false, reason }`. |
| GET | `/health` | `200` body `ok`. |

**Reason codes:** `NOT_FOUND`, `EXPIRED`, `REPLAY`, `CONTINUITY_MISMATCH`, `BAD_BODY`, `csrf_mismatch`, `missing_continuity`, `invalid_destination`.

---

## Schema update (existing installs)

If you already had `redemption_ledger` before the dst columns were added, run once:

```sql
ALTER TABLE redemption_ledger ADD COLUMN dst_host TEXT;
ALTER TABLE redemption_ledger ADD COLUMN dst_path_len INTEGER;
ALTER TABLE redemption_ledger ADD COLUMN dst_hash TEXT;
```

---

## License

ISC
