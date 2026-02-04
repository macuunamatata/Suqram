# Cloudflare Pages deploy (marketing site)

## Cloudflare Pages settings

Use these exact settings in the Pages project:

- **Root directory:** `site` (or repo root if you run build from root)
- **Build command:** `npm run pages:build`
- **Build output directory:** `.vercel/output/static`

**There must be no `wrangler.toml` at repo root and none in `site/`.** Pages uses either the repo root or `site/` as the build root; if it finds a wrangler.toml there it validates it and fails on Worker-only keys. All Worker config lives in `worker/wrangler.toml` only. The repo is already set up this way; do not add wrangler.toml at root or in site.

---

## Worker deploy (go.suqram.com)

Worker config lives in `worker/wrangler.toml`. From repo root:

- **Deploy Worker:**  
  `wrangler deploy -c worker/wrangler.toml`  
  (or `npm run worker:deploy`)

- **D1 migrations (remote):**  
  `wrangler d1 migrations apply eig-db --remote -c worker/wrangler.toml`  
  (or `npm run worker:migrate`)

---

## Why we do not use `next export` / `out/`

This app uses NextAuth (API routes) and middleware for login-first flows and route protection. Those require server/edge execution. `next export` only produces static HTML into `out/` and cannot run API routes or middleware. We use **@cloudflare/next-on-pages** (pinned to 1.13.10 for Next 14 compatibility) to build a Pages-compatible output: static assets go to `site/.vercel/output/static`, and API/middleware run as Workers so the app works on Cloudflare Pages.
