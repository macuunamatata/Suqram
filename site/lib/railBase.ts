/**
 * Rail base URL for Worker API (counters, login, create-site, logout).
 * Use only for API calls to the Worker (go.suqram.com), never for dashboard page links.
 */
const PRODUCTION_RAIL = "https://go.suqram.com";
const LOCAL_RAIL = "http://127.0.0.1:8787";

export function getRailBaseUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_RAIL;
  const pub = process.env.NEXT_PUBLIC_RAIL_BASE;
  if (pub && typeof pub === "string" && pub.trim()) return pub.trim().replace(/\/$/, "");
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return LOCAL_RAIL;
  return PRODUCTION_RAIL;
}

/**
 * Demo API base: always the Worker (go.suqram.com) so demo/create and demo/scan
 * never hit the Pages site (suqram.com). On localhost uses getRailBaseUrl() for dev.
 */
export function getDemoApiBase(): string {
  if (typeof window === "undefined") return PRODUCTION_RAIL;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return getRailBaseUrl();
  return PRODUCTION_RAIL;
}

/**
 * Pages site origin (suqram.com) for redirect targets sent to the Worker.
 * Ensures post-login/logout redirects go to the dashboard site, not the Worker domain.
 */
const PRODUCTION_SITE_ORIGIN = "https://suqram.com";

export function getSiteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (env && typeof env === "string" && env.trim()) return env.trim().replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return PRODUCTION_SITE_ORIGIN;
}
