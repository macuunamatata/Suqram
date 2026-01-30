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

2. **Set build settings**  
   - **Root directory:** `site`  
   - **Framework preset:** Next.js (Static HTML Export)  
   - **Build command:** `npm run build`  
   - **Output directory:** `out`  
   Save and deploy.

3. **Add custom domain**  
   In the Pages project: **Custom domains** → **Set up a custom domain** → enter **suqram.com**.  
   Optionally add **www.suqram.com** as well. Cloudflare will add the DNS records.

4. **Verify**  
   - Landing: **https://suqram.com/**  
   - Start (link generator): **https://suqram.com/start/**  
   - Pricing: **https://suqram.com/pricing/**  
   - On Start, the “Rail base URL” field should default to **https://go.suqram.com** (change it only if you use a different rail domain).

The worker runs separately from the repo root (`npm run dev` there starts the Cloudflare Worker on port 8787).
