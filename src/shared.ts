export interface LinkEvent {
  nonce: string;
  timestamp: number;
  action: 'minted' | 'redeemed' | 'expired' | 'denied' | 'replay';
  originUrl?: string;
  ip?: string;
  ua?: string;
  note?: string;
  siteId?: string;
  hostname?: string;
}

export interface SiteConfig {
  siteId: string;
  hostname: string;
  originBaseUrl: string;
  pathAllowlist: string[];
  queryAllowlist: string[];
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  satHash: string; // SHA-256 hash of Site Access Token
  createdAt: number;
}

export interface NonceData {
  nonce: string;
  originUrl: string;
  createdAt: number;
  ttl: number;
  redeemed: boolean;
  continuityId: string;
  proofSeed?: string; // Stored for debugging purposes
}

export const NONCE_TTL = 2 * 60 * 1000; // 2 minutes in milliseconds
export const MAX_EVENTS_PER_SITE = 10000; // Maximum events to store per site
export const EVENT_RETENTION_DAYS = 14; // Events older than this are deleted
export const EVENT_RETENTION_MS = EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

// Rate limiting
export const RATE_LIMIT_PHASE_A = 100; // Max Phase A (GET /l/*) requests per window
export const RATE_LIMIT_PHASE_B = 30; // Max Phase B (POST /v/*) requests per window
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
