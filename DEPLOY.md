# Cloudflare Pages deploy (marketing site)

## Cloudflare Pages settings

Use these exact settings in the Pages project:

- **Root directory:** repo root
- **Build command:** `npm run build`
- **Build output directory:** `site/.vercel/output/static`

## Why we do not use `next export` / `out/`

This app uses NextAuth (API routes) and middleware for login-first flows and route protection. Those require server/edge execution. `next export` only produces static HTML into `out/` and cannot run API routes or middleware. We use **@cloudflare/next-on-pages** (pinned to 1.13.10 for Next 14 compatibility) to build a Pages-compatible output: static assets go to `site/.vercel/output/static`, and API/middleware run as Workers so the app works on Cloudflare Pages.
