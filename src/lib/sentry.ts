/**
 * Sentry configuration.
 * Set NEXT_PUBLIC_SENTRY_DSN env var to enable error monitoring.
 * Without it, Sentry is a no-op (no errors sent, no overhead).
 */
import * as Sentry from '@sentry/nextjs'

export function registerSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1, // 10% of transactions traced
    profilesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    denyUrls: [/localhost/], // Don't track local dev errors
  })
}
