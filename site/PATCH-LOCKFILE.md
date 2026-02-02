# Patch package-lock.json for Next.js SWC (Cloudflare build)

Run these commands from **Windows PowerShell** (repo root or `site`).

## Option A: From repo root

```powershell
Set-Location c:\Users\marcu\scanner-safe-links\site
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm run build
Set-Location c:\Users\marcu\scanner-safe-links
git status
```

## Option B: Already in `site` directory

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm run build
git status
```

## What will change

- **`site/package-lock.json`** — Will change if `npm install` or the Next build updates the lockfile (e.g. optional SWC deps, nested `node_modules` resolution). This is the file to commit to fix Cloudflare’s “missing SWC dependencies” warning.
- **`site/package.json`** — Usually unchanged; only if npm touches it (e.g. engine/node version).

After running, commit only what you intend (typically just `site/package-lock.json`):

```powershell
git add site/package-lock.json
git commit -m "site: update lockfile for Next.js SWC (Cloudflare build)"
```

## If Cloudflare still warns

The lockfile may have been generated only on Windows, so it might only list Windows SWC. To get **Linux** SWC into the lockfile (Cloudflare runs Linux), generate the lockfile on Linux once, then commit it:

- **WSL:** Open WSL, `cd /mnt/c/Users/marcu/scanner-safe-links/site`, then `rm -rf node_modules && npm install && npm run build`, then copy the repo back to Windows and commit `site/package-lock.json`.
- **Docker:** e.g. `docker run --rm -v "${PWD}/site:/app" -w /app node:22 npm install && npm run build` from repo root (PowerShell), then commit `site/package-lock.json`.
