// Strict destination validation: exact host allowlist > suffix allowlist > default (https, no private IP).
// Always block javascript:/data:. Block private IPs unless explicitly allowed.

export interface ValidateDestinationOptions {
  /** Comma-separated exact hosts, e.g. "example.com,myapp.vercel.app" */
  allowedHosts?: string;
  /** Comma-separated host suffixes, e.g. ".supabase.co,.vercel.app" */
  allowedHostSuffixes?: string;
  /** If true, allow private IP ranges (e.g. for dev) */
  allowedPrivateIP?: boolean;
}

function parseList(s: string | undefined): string[] {
  if (!s || typeof s !== 'string') return [];
  return s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
}

function isPrivateIP(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h.startsWith('192.168.') || h.startsWith('10.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  return false;
}

/**
 * Validate destination URL. Exact host allowlist takes precedence; suffix allowlist is optional convenience.
 * Still blocks javascript:/data: and private IPs unless allowedPrivateIP.
 */
export function validateDestinationUrl(
  url: string,
  opts?: ValidateDestinationOptions
): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return { valid: false, error: 'Dangerous protocol' };
    }

    const hostname = parsed.hostname.toLowerCase();
    const exactList = parseList(opts?.allowedHosts);
    const suffixList = parseList(opts?.allowedHostSuffixes);

    const inExact = exactList.some((h) => h === hostname);
    const inSuffix = suffixList.some((s) => hostname === s || hostname.endsWith(s));
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('127.') ||
      hostname === '::1';

    // Exact allowlist takes precedence; suffix is optional convenience; localhost allowed for dev
    const allowedByList = inExact || inSuffix || isLocalhost;
    if (!allowedByList) {
      return { valid: false, error: 'Destination host not allowed' };
    }

    if (parsed.protocol !== 'https:' && !isLocalhost) {
      return { valid: false, error: 'Non-https URL not allowed' };
    }

    if (isPrivateIP(hostname) && !opts?.allowedPrivateIP) {
      return { valid: false, error: 'Private IP range not allowed' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
