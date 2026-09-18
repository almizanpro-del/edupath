/**
 * Sentry configuration.
 * Set NEXT_PUBLIC_SENTRY_DSN env var to enable error monitoring.
 * Without it, Sentry is a no-op (no errors sent, no overhead).
 *
 * Note: We use a lightweight approach — no withSentryConfig wrapper needed.
 * Sentry.init is called via instrumentation.ts on the server side,
 * and captureException is called directly from error.tsx on the client side.
 * This avoids build-time complexities while still capturing errors.
 */

let initialized = false

export function registerSentry() {
  if (initialized) return
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  try {
    // Dynamic import — avoids build-time requirement for sentry config files
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
        environment: process.env.NODE_ENV,
        denyUrls: [/localhost/],
      })
      initialized = true
    }).catch(() => {
      // Sentry not available — skip
    })
  } catch {
    // No-op
  }
}

/**
 * Capture an exception on the client side.
 * Safe to call even if Sentry is not configured.
 */
export function captureException(error: Error | unknown): void {
  if (typeof window === 'undefined') return
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  try {
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error)
    }).catch(() => {})
  } catch {
    // No-op
  }
}
