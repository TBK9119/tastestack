// Best-effort, in-memory rate limiting. This resets on cold start and isn't
// shared across serverless instances, so it won't stop a distributed attack —
// for that, Vercel's Firewall rate-limit rules (free on Hobby, one rule
// included per project) enforce at the edge before a request even reaches
// this code, and are worth adding alongside this. This module is a free,
// zero-dependency baseline that stops casual scripted abuse (a single script
// hammering /api/auth/signup or brute-forcing a login) without needing an
// external service like Upstash.
//
// Mirrors the globalThis-singleton pattern already used in lib/db.ts, so the
// store survives across warm serverless invocations instead of resetting on
// every request.

type Bucket = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as { rateLimitStore: Map<string, Bucket> | undefined };
const store = globalForRateLimit.rateLimitStore ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") globalForRateLimit.rateLimitStore = store;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

// `key` should already include the action name, e.g. `signup:${ip}`, so
// different endpoints don't share the same bucket for the same IP.
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

// Vercel sets x-forwarded-for reliably at the edge; take the first (client)
// hop since the header can carry a chain of proxy IPs.
export function clientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (name: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(name) || undefined;
    const v = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };
  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return get("x-real-ip") || "unknown";
}
