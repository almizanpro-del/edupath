/**
 * Simple in-memory rate limiter for API routes.
 *
 * NOTE: This is a per-instance rate limiter. On Vercel serverless (or any
 * multi-instance deployment), each function instance has its own Map, so
 * an attacker can bypass limits by hitting different instances. For true
 * distributed rate limiting, use Upstash Redis (`@upstash/ratelimit`)
 * or Vercel's built-in rate limiting.
 *
 * Despite that caveat, this STILL catches the most common abuse patterns
 * (scripted attacks from a single client hitting the same instance
 * repeatedly) and is better than no rate limiting at all.
 *
 * Usage:
 *   import { rateLimit } from '@/lib/rate-limit'
 *
 *   export async function POST(req: NextRequest) {
 *     const limited = rateLimit(req, { windowMs: 60_000, max: 5 })
 *     if (limited) return limited
 *     // ... handler
 *   }
 */
import { NextResponse, NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }

// Map key → bucket. Entries expire after windowMs to prevent memory leaks.
const buckets = new Map<string, Bucket>()

// Periodically purge expired entries (every 5 minutes)
let lastPurge = Date.now()
const PURGE_INTERVAL_MS = 5 * 60 * 1000

function purgeExpired(now: number) {
  if (now - lastPurge < PURGE_INTERVAL_MS) return
  lastPurge = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}

type RateLimitOptions = {
  /** Time window in milliseconds (default: 1 minute) */
  windowMs?: number
  /** Max requests per window (default: 10) */
  max?: number
  /** Optional key prefix to namespace different routes (e.g. 'leads') */
  prefix?: string
}

/**
 * Returns a 429 NextResponse if rate limited, or `null` if the request is allowed.
 * Keyed on the client IP (from x-forwarded-for or x-real-ip).
 */
export function rateLimit(
  req: NextRequest,
  options: RateLimitOptions = {}
): NextResponse | null {
  const windowMs = options.windowMs ?? 60_000
  const max = options.max ?? 10
  const prefix = options.prefix ?? 'default'

  // Get client IP — Vercel sets x-forwarded-for, local dev uses x-real-ip
  const xff = req.headers.get('x-forwarded-for')
  const ip = xff?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'

  const key = `${prefix}:${ip}`
  const now = Date.now()
  purgeExpired(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt < now) {
    // New window
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  existing.count++
  if (existing.count > max) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000)
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      }
    )
  }

  return null
}
