# Auth Link Rail — Marketing site

Next.js (App Router) static export + Tailwind. Routes: `/`, `/start/`, `/pricing/`, `/docs/`, `/terms/`, `/privacy/`.

**Run locally**

```bash
cd site
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Build (static export)**

```bash
npm run build
```

Output is in `out/`. All routes are static HTML (e.g. `out/index.html`, `out/start/index.html`).

---

## Deploy to Cloudflare Pages (suqram.com)

1. **Create the project from Git**  
   **Cloudflare Dashboard** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.  
   Select the repo and branch.

2. **Set build settings** (must match exactly so production looks like local)  
   - **Root directory:** `site`  
   - **Framework preset:** Next.js (Static HTML Export)  
   - **Build command:** `npm run build`  
   - **Output directory:** `out`  
   Save and deploy. The site must be served from the **root** of the domain (no subpath). Asset URLs are root-relative (e.g. `/_next/static/css/...`).

3. **Add custom domain**  
   In the Pages project: **Custom domains** → **Set up a custom domain** → enter **suqram.com**.  
   Optionally add **www.suqram.com** as well. Cloudflare will add the DNS records.

4. **Verify**  
   - Landing: **https://suqram.com/**  
   - Start (link generator): **https://suqram.com/start/**  
   - Pricing: **https://suqram.com/pricing/**  
   - On Start, the “Rail base URL” field should default to **https://go.suqram.com** (change it only if you use a different rail domain).

The worker runs separately from the repo root (`npm run dev` there starts the Cloudflare Worker on port 8787).

---

## Production styling (CSS, fonts, assets)

- **CSS:** Tailwind is built into a single file at `out/_next/static/css/<hash>.css`. The HTML references it as `/_next/static/css/<hash>.css`. Cloudflare Pages must serve the contents of `out/` as the site root so that `/_next/...` resolves correctly.
- **Fonts:** The site uses the system font stack only (no `next/font` or Google Fonts). No font assets to deploy.
- **Asset paths:** All asset URLs are root-relative (no `localhost`, no `basePath`). If the site is ever deployed under a subpath, set `basePath` in `next.config.js` to match.

**If production looks unstyled:**  
1. Confirm Pages **Root directory** = `site` and **Output directory** = `out`.  
2. In the browser, open DevTools → Network and reload. Check whether the request to `/_next/static/css/...` returns 200 or 404.  
3. If 404, the build output is not being used as the document root (fix Root/Output in Pages).  
4. From the repo root, run `npm run build` then inspect `site/out/_next/static/css/` to confirm the CSS file exists.
