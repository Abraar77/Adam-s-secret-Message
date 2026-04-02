// ---------------------------------------------------------------------------
// Distributed rate limiting via Upstash Redis (production).
// Falls back to an in-memory sliding window when env vars are absent (local dev).
// ---------------------------------------------------------------------------

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 8;

// ── In-memory fallback (local dev only) ────────────────────────────────────

const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_BUCKETS = 5000;
const buckets: Map<string, number[]> = new Map();
let nextCleanupAt = 0;

function inMemoryAllow(key: string): boolean {
  const now = Date.now();
  if (now >= nextCleanupAt || buckets.size > MAX_BUCKETS) {
    const windowStart = now - WINDOW_MS;
    for (const [k, timestamps] of buckets.entries()) {
      const filtered = timestamps.filter((ts) => ts > windowStart);
      if (!filtered.length) buckets.delete(k);
      else buckets.set(k, filtered);
    }
    if (buckets.size > MAX_BUCKETS) {
      const sorted = [...buckets.entries()].sort(
        (a, b) => a[1][a[1].length - 1] - b[1][b[1].length - 1]
      );
      sorted.slice(0, buckets.size - MAX_BUCKETS).forEach(([k]) => buckets.delete(k));
    }
    nextCleanupAt = now + CLEANUP_INTERVAL_MS;
  }

  const windowStart = now - WINDOW_MS;
  const existing = (buckets.get(key) ?? []).filter((ts) => ts > windowStart);
  if (existing.length >= MAX_REQUESTS) {
    buckets.set(key, existing);
    return false;
  }
  existing.push(now);
  buckets.set(key, existing);
  return true;
}

// ── Upstash Redis (production) ──────────────────────────────────────────────

let ratelimit: import("@upstash/ratelimit").Ratelimit | null = null;

async function getUpstashRatelimit() {
  if (ratelimit) return ratelimit;
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "10 m"),
    analytics: false,
    prefix: "draw-me:rl",
  });
  return ratelimit;
}

// ── Public API ──────────────────────────────────────────────────────────────

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
};

export async function allowRequest(key: string): Promise<RateLimitResult> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    // Local dev: use in-memory fallback
    const allowed = inMemoryAllow(key);
    return { allowed, remaining: allowed ? MAX_REQUESTS - 1 : 0, resetAt: Date.now() + WINDOW_MS };
  }

  try {
    const rl = await getUpstashRatelimit();
    const { success, remaining, reset } = await rl.limit(key);
    return { allowed: success, remaining, resetAt: reset };
  } catch {
    // Fail open — never drop traffic due to Redis being unavailable
    console.error("[rate-limit] Upstash error, failing open");
    return { allowed: true, remaining: 1, resetAt: Date.now() + WINDOW_MS };
  }
}
