/**
 * DyslexiMate API Rate Limiter
 * Provides robust token-bucket rate limiting and client IP extraction
 * for edge runtime, serverless functions, and local development.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec?: number;
  resetTimeMs?: number;
}

export interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const MAX_BUCKETS = 10000;
const rateLimitBuckets = new Map<string, Bucket>();

function pruneStaleBuckets(now: number, windowMs = 60000): void {
  const expiryThreshold = Math.max(windowMs * 2, 300000);
  for (const [key, b] of rateLimitBuckets.entries()) {
    if (now - b.lastRefill > expiryThreshold) {
      rateLimitBuckets.delete(key);
    }
  }
}

/**
 * Checks whether an incoming request key (e.g. IP or token) is within the rate limit.
 * Uses a token bucket / fixed window algorithm with automatic state cleanup.
 */
export function checkRateLimit(
  key: string,
  maxRequests = 60,
  windowMs = 60000
): RateLimitResult {
  if (maxRequests <= 0) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil(windowMs / 1000)),
      resetTimeMs: Date.now() + windowMs,
    };
  }

  const now = Date.now();
  let bucket = rateLimitBuckets.get(key);

  if (!bucket) {
    if (rateLimitBuckets.size >= MAX_BUCKETS) {
      pruneStaleBuckets(now, windowMs);
      if (rateLimitBuckets.size >= MAX_BUCKETS) {
        const oldestKey = rateLimitBuckets.keys().next().value;
        if (oldestKey !== undefined) {
          rateLimitBuckets.delete(oldestKey);
        }
      }
    }

    bucket = { tokens: maxRequests - 1, lastRefill: now };
    rateLimitBuckets.set(key, bucket);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTimeMs: now + windowMs,
    };
  }

  const elapsed = now - bucket.lastRefill;

  // Window expired: replenish tokens and reset timestamp
  if (elapsed >= windowMs) {
    bucket.tokens = maxRequests - 1;
    bucket.lastRefill = now;
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTimeMs: now + windowMs,
    };
  }

  // Tokens still available in current window
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetTimeMs: bucket.lastRefill + windowMs,
    };
  }

  // Rate limit exceeded
  const retryAfterSec = Math.max(1, Math.ceil((windowMs - elapsed) / 1000));
  return {
    allowed: false,
    remaining: 0,
    retryAfterSec,
    resetTimeMs: bucket.lastRefill + windowMs,
  };
}

/**
 * Extracts and normalizes the client IP address from Web standard Request
 * or Node.js IncomingMessage objects, respecting reverse proxies and CDNs.
 */
export function getClientIp(req: unknown): string {
  if (!req) return '127.0.0.1';

  let rawIp = '';

  if (typeof Request !== 'undefined' && req instanceof Request) {
    rawIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '';
  } else if (typeof req === 'object' && req !== null) {
    const nodeReq = req as {
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    };

    const cfIp = nodeReq.headers?.['cf-connecting-ip'];
    const cfIpStr = Array.isArray(cfIp) ? cfIp[0] : cfIp;

    const vercelIp = nodeReq.headers?.['x-vercel-forwarded-for'];
    const vercelIpStr = Array.isArray(vercelIp) ? vercelIp[0] : vercelIp;

    const forwarded = nodeReq.headers?.['x-forwarded-for'];
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    const realIp = nodeReq.headers?.['x-real-ip'];
    const realIpStr = Array.isArray(realIp) ? realIp[0] : realIp;

    rawIp =
      cfIpStr ||
      vercelIpStr?.split(',')[0]?.trim() ||
      forwardedStr?.split(',')[0]?.trim() ||
      realIpStr ||
      nodeReq.socket?.remoteAddress ||
      '';
  }

  if (!rawIp) return '127.0.0.1';

  // Normalize IPv6-mapped IPv4 addresses (::ffff:127.0.0.1 -> 127.0.0.1)
  if (rawIp.startsWith('::ffff:')) {
    rawIp = rawIp.slice(7);
  }

  // Normalize IPv6 loopback
  if (rawIp === '::1') {
    return '127.0.0.1';
  }

  return rawIp.trim() || '127.0.0.1';
}

/**
 * Resets the in-memory rate limiting store (useful for automated testing).
 */
export function resetRateLimits(): void {
  rateLimitBuckets.clear();
}

// Background cleanup routine to prevent memory leaks in standing server instances
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    pruneStaleBuckets(Date.now());
  }, 300000);

  if (timer && typeof (timer as any).unref === 'function') {
    (timer as any).unref();
  }
}
