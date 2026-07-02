// src/lib/rateLimit.ts
//
// Free-tier rate limiting. Vercel serverless functions are stateless and
// multi-instance, so a true in-memory limiter is approximate (each instance
// has its own counters) — fine for slowing down casual brute force, not a
// hard guarantee. For stronger guarantees later, swap this for Upstash
// Redis's free tier (10k commands/day) — the function signature below is
// designed so that swap requires no changes to call sites.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Returns true if the action is allowed, false if rate-limited.
 * @param key Unique key for the action+actor, e.g. "login:1.2.3.4"
 * @param limit Max allowed attempts within the window
 * @param windowSeconds Window size in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

// Periodically clear stale buckets so the Map doesn't grow unbounded
// within a long-lived serverless instance.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000);
