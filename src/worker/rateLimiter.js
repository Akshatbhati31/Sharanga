const MAX_BUCKETS = 1e4;
const rateLimitBuckets = /* @__PURE__ */ new Map();
function pruneStaleBuckets(now, windowMs = 6e4) {
  const expiryThreshold = Math.max(windowMs * 2, 3e5);
  for (const [key, b] of rateLimitBuckets.entries()) {
    if (now - b.lastRefill > expiryThreshold) {
      rateLimitBuckets.delete(key);
    }
  }
}
function checkRateLimit(key, maxRequests = 60, windowMs = 6e4) {
  if (maxRequests <= 0) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil(windowMs / 1e3)),
      resetTimeMs: Date.now() + windowMs
    };
  }
  const now = Date.now();
  let bucket = rateLimitBuckets.get(key);
  if (!bucket) {
    if (rateLimitBuckets.size >= MAX_BUCKETS) {
      pruneStaleBuckets(now, windowMs);
      if (rateLimitBuckets.size >= MAX_BUCKETS) {
        const oldestKey = rateLimitBuckets.keys().next().value;
        if (oldestKey !== void 0) {
          rateLimitBuckets.delete(oldestKey);
        }
      }
    }
    bucket = { tokens: maxRequests - 1, lastRefill: now };
    rateLimitBuckets.set(key, bucket);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTimeMs: now + windowMs
    };
  }
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= windowMs) {
    bucket.tokens = maxRequests - 1;
    bucket.lastRefill = now;
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTimeMs: now + windowMs
    };
  }
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetTimeMs: bucket.lastRefill + windowMs
    };
  }
  const retryAfterSec = Math.max(1, Math.ceil((windowMs - elapsed) / 1e3));
  return {
    allowed: false,
    remaining: 0,
    retryAfterSec,
    resetTimeMs: bucket.lastRefill + windowMs
  };
}
function getClientIp(req) {
  if (!req) return "127.0.0.1";
  let rawIp = "";
  if (typeof Request !== "undefined" && req instanceof Request) {
    rawIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  } else if (typeof req === "object" && req !== null) {
    const nodeReq = req;
    const cfIp = nodeReq.headers?.["cf-connecting-ip"];
    const cfIpStr = Array.isArray(cfIp) ? cfIp[0] : cfIp;
    const vercelIp = nodeReq.headers?.["x-vercel-forwarded-for"];
    const vercelIpStr = Array.isArray(vercelIp) ? vercelIp[0] : vercelIp;
    const forwarded = nodeReq.headers?.["x-forwarded-for"];
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const realIp = nodeReq.headers?.["x-real-ip"];
    const realIpStr = Array.isArray(realIp) ? realIp[0] : realIp;
    rawIp = cfIpStr || vercelIpStr?.split(",")[0]?.trim() || forwardedStr?.split(",")[0]?.trim() || realIpStr || nodeReq.socket?.remoteAddress || "";
  }
  if (!rawIp) return "127.0.0.1";
  if (rawIp.startsWith("::ffff:")) {
    rawIp = rawIp.slice(7);
  }
  if (rawIp === "::1") {
    return "127.0.0.1";
  }
  return rawIp.trim() || "127.0.0.1";
}
function resetRateLimits() {
  rateLimitBuckets.clear();
}
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    pruneStaleBuckets(Date.now());
  }, 3e5);
  if (timer && typeof timer.unref === "function") {
    timer.unref();
  }
}
export {
  checkRateLimit,
  getClientIp,
  resetRateLimits
};
