export interface RateLimitOptions {
  windowMs: number;
  max: number;
  maxEntries?: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter (best-effort).
 *
 * NOTE: In serverless / multi-instance environments this is not durable and should
 * be replaced with a shared store (Redis/Upstash). This is still useful for basic
 * protection and local dev.
 */
export function createInMemoryRateLimiter(options: RateLimitOptions) {
  const maxEntries = options.maxEntries ?? 10_000;
  const store = new Map<string, Entry>();

  function prune(now: number) {
    if (store.size <= maxEntries) return;
    // Remove expired entries first; if still too big, drop oldest keys iteratively.
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
      if (store.size <= maxEntries) return;
    }
    // Still too big: delete in insertion order until under limit.
    while (store.size > maxEntries) {
      const firstKey = store.keys().next().value as string | undefined;
      if (!firstKey) break;
      store.delete(firstKey);
    }
  }

  return {
    /**
     * Returns `true` if request is allowed, `false` otherwise.
     */
    allow(key: string): boolean {
      const now = Date.now();
      prune(now);

      const existing = store.get(key);
      if (!existing || now > existing.resetAt) {
        store.set(key, { count: 1, resetAt: now + options.windowMs });
        return true;
      }

      if (existing.count >= options.max) return false;
      existing.count += 1;
      return true;
    },
  };
}

