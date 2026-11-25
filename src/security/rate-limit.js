// Development safety net only.
// Each Worker isolate has its own Map, so this is NOT a global distributed
// rate limiter. Configure Cloudflare's platform rate limiting for production.
export function createIsolateRateLimiter({
  limit = 120,
  windowMs = 60_000,
  maxKeys = 5_000
} = {}) {
  const buckets = new Map();

  return {
    check(key) {
      const now = Date.now();
      const id = String(key || "unknown").slice(0, 100);
      let bucket = buckets.get(id);

      if (!bucket || now - bucket.start >= windowMs) {
        bucket = { start: now, count: 0 };
      }

      bucket.count += 1;
      buckets.set(id, bucket);

      if (buckets.size > maxKeys) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }

      return {
        allowed: bucket.count <= limit,
        remaining: Math.max(0, limit - bucket.count),
        resetAt: bucket.start + windowMs
      };
    }
  };
}
