/**
 * CSRF protection for Next.js Route Handlers.
 *
 * Next.js 16 has built-in CSRF protection for Server Actions, but NOT for
 * Route Handlers (POST/PATCH/PUT/DELETE endpoints under /api).
 * Combined with cookie-based Supabase sessions, a malicious site could
 * POST to /api/leads, /api/reviews, /api/stripe/checkout, etc. while the
 * user is signed in.
 *
 * This helper checks the `Origin` (preferred) or `Sec-Fetch-Site` header
 * to ensure the request came from the same origin.
 *
 * Usage:
 *   import { requireSameOrigin } from '@/lib/csrf'
 *
 *   export async function POST(req: NextRequest) {
 *     const csrfError = requireSameOrigin(req)
 *     if (csrfError) return csrfError
 *     // ... rest of handler
 *   }
 *
 * Routes that should be exempt (e.g. Stripe webhook which uses signature
 * verification instead) should NOT call this helper.
 */
import { NextResponse, NextRequest } from 'next/server'

/**
 * Returns `null` if the request passes the same-origin check, or a
 * 403 NextResponse if it fails. Callers should early-return the response.
 */
export function requireSameOrigin(req: NextRequest): NextResponse | null {
  // `Sec-Fetch-Site` is sent by all modern browsers on fetch requests.
  // `same-origin` = the request originated from the same origin as the target.
  // `none` = user-typed URL or bookmark (no cross-origin context).
  // `same-site` = same site (e.g. subdomain) but different origin — we still
  //   reject to be strict; if needed, relax to allow `same-site` too.
  const secFetchSite = req.headers.get('sec-fetch-site')
  if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
    return null
  }

  // Fall back to comparing Origin against the request's own host
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (origin && host) {
    try {
      const originUrl = new URL(origin)
      if (originUrl.host === host) {
        return null
      }
    } catch {
      // Malformed origin — fail closed
    }
  }

  // No Sec-Fetch-Site and no matching Origin — reject.
  // Note: this also blocks non-browser clients (curl, Postman) which is
  // desired for state-changing endpoints. Public API clients should use
  // a separate token-based auth flow.
  return NextResponse.json(
    { error: 'Forbidden: cross-origin requests not allowed' },
    { status: 403 }
  )
}
