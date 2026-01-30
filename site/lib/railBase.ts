/**
 * Rail base URL for /test/send and link generator.
 * Only call from client (e.g. in event handlers); uses window when available.
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
