export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Upper bound on tracked clients, so memory stays bounded under a flood of distinct IPs. */
  maxKeys?: number;
  now?: () => number;
}

/**
 * Sliding-window limiter held in process memory. Exact within one instance;
 * on serverless platforms each instance counts separately, so treat it as a
 * per-instance guard and put a shared store (Redis, Cloud Armor) in front for
 * a global limit. See the README security section.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 10_000, now = Date.now }: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => ts > t - windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        const oldest = recent[0] ?? t;
        return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - t) / 1000)) };
      }

      recent.push(t);
      hits.delete(key); // re-insert so Map order tracks recency
      hits.set(key, recent);
      if (hits.size > maxKeys) {
        const oldestKey = hits.keys().next().value;
        if (oldestKey !== undefined) hits.delete(oldestKey);
      }
      return { allowed: true, remaining: limit - recent.length, retryAfterSec: 0 };
    },
  };
}
