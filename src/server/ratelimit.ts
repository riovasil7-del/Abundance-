/**
 * Single-process limiter. The interface is the seam for Redis later.
 * Enough for one Node server; do not treat it as a global lock across instances.
 */

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): RateLimitResult;
}

const hits = new Map<string, number[]>();

export const memoryRateLimiter: RateLimiter = {
  consume(key, limit, windowMs) {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= limit) {
      const retryAfterMs = Math.max(0, windowMs - (now - recent[0]!));
      hits.set(key, recent);
      return { ok: false, retryAfterMs };
    }
    recent.push(now);
    hits.set(key, recent);
    return { ok: true };
  },
};

export function clientKey(request: Request, action: string, userId?: string | null): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || "local";
  return `${action}:${userId ?? ip}`;
}
