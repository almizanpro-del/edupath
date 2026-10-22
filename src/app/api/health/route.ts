/**
 * GET /api/health
 *
 * Lightweight liveness + readiness probe for Vercel, uptime monitors,
 * and load balancers. Returns 200 if the Node process is up; the body
 * includes per-subsystem checks so callers can distinguish "process is
 * up but a dependency is down" from "process is down" (which would be a
 * 5xx or a connection reset).
 *
 * Designed to be cheap: every check has a tight timeout and never throws.
 * The route is intentionally public (no auth) so external monitors can
 * poll it. It does NOT leak secrets, env var values, or user data — only
 * booleans and a timestamp.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Avoid caching — health must always reflect the current state.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

type CheckStatus = 'ok' | 'degraded' | 'down'

type CheckResult = {
  status: CheckStatus
  /** Optional human-readable note (no secrets). */
  note?: string
  /** Latency in milliseconds, when the check involved I/O. */
  latencyMs?: number
}

/**
 * Probe the database with a trivial query. Wraps in try/catch and a
 * manual timeout so a hanging DB connection cannot stall the health
 * check (Vercel would otherwise time out the entire request).
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('db timeout')), 1500)
  )
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      timeout,
    ])
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    const note =
      err instanceof Error && err.message === 'db timeout'
        ? 'database did not respond within 1500ms'
        : 'database unreachable (likely missing DATABASE_URL on this deployment)'
    return { status: 'degraded', note, latencyMs: Date.now() - start }
  }
}

/**
 * Report whether the LLM provider (OpenAI / xAI / ZAI) is configured.
 * We do NOT make a real call — that would be slow and would burn quota
 * on every poll. We just report whether an API key is present.
 */
function checkLlmConfig(): CheckResult {
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasXAI = !!process.env.XAI_API_KEY
  const hasZAI = !!process.env.ZAI_API_KEY || !!process.env.ZAI_TOKEN
  if (hasOpenAI || hasXAI || hasZAI) {
    return {
      status: 'ok',
      note: [
        hasOpenAI && 'openai',
        hasXAI && 'xai',
        hasZAI && 'zai',
      ]
        .filter(Boolean)
        .join(', '),
    }
  }
  return {
    status: 'degraded',
    note: 'no LLM provider configured — Rihla will fall back to template explanations',
  }
}

function checkSupabaseConfig(): CheckResult {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (hasUrl && hasAnonKey) return { status: 'ok' }
  return {
    status: 'degraded',
    note: 'Supabase env vars missing — auth, reviews, saved lists, and admin will be unavailable',
  }
}

function checkStripeConfig(): CheckResult {
  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET
  const hasPriceBasic = !!process.env.STRIPE_PRICE_BASIC
  const hasPricePro = !!process.env.STRIPE_PRICE_PRO
  if (hasSecretKey && hasWebhookSecret && hasPriceBasic && hasPricePro) {
    return { status: 'ok' }
  }
  return {
    status: 'degraded',
    note: 'Stripe env vars incomplete — paid tiers cannot be purchased',
  }
}

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    llm: checkLlmConfig(),
    supabase: checkSupabaseConfig(),
    stripe: checkStripeConfig(),
  }

  // Overall status: "ok" if every check is ok, "degraded" if any is degraded,
  // "down" only if the process itself is unreachable (which means this code
  // never runs — so we never actually return "down").
  const overall: CheckStatus = Object.values(checks).some(c => c.status === 'degraded')
    ? 'degraded'
    : 'ok'

  const statusCode = overall === 'ok' ? 200 : 200 // 200 even when degraded — process is up
  // Use 503 only when a hard dependency is fully down. We don't have one
  // that can be hard-down without the process being down, so we always
  // return 200 here. External monitors that want to alert on degraded
  // should parse the JSON body.

  return NextResponse.json(
    {
      status: overall,
      service: 'edupath-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.round(process.uptime()) : null,
      checks,
    },
    { status: statusCode }
  )
}
