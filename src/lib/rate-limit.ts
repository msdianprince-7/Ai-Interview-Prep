/**
 * Fixed-window rate limiter backed by an in-process Map.
 *
 * Limitation: state lives in one server instance. On a multi-instance or
 * serverless deployment each instance keeps its own counters, so the effective
 * limit is (limit x instances). That is still a large improvement over no
 * limit at all, but before scaling out this should be swapped for a shared
 * store (Upstash Redis / @vercel/kv) behind the same `rateLimit` signature.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Buckets are only removed when touched, so sweep periodically to stop the
// Map growing without bound under a spray of unique IPs.
let lastSweep = Date.now()
const SWEEP_INTERVAL_MS = 60_000

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number }

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count++
  return { ok: true }
}

/**
 * Best-effort client IP. `x-forwarded-for` is only trustworthy behind a proxy
 * that overwrites it (Vercel and most managed hosts do); direct-to-Node
 * deployments must not rely on this alone.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}
