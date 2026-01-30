import { getRailBaseUrl } from "./railBase";

export const NETWORK_ERROR_MESSAGE =
  "Can't reach the link service. If you're running locally, start the Worker or set NEXT_PUBLIC_RAIL_BASE. If you're on suqram.com, check that go.suqram.com is deployed + DNS is set.";

const TIMEOUT_MS = 8000;

/**
 * Sends a test email via the Worker /test/send endpoint.
 * Never throws; returns { ok, error? } so callers never get unhandled rejections.
 */
export async function sendTestEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const base = getRailBaseUrl();
  const url = `${base}/test/send`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true };
    }
    const errMsg =
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
    return { ok: false, error: errMsg };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Request timed out. Try again." };
    }
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
}
