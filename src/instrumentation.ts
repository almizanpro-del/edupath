/**
 * Next.js instrumentation hook — runs on server startup.
 * Registers Sentry if configured.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerSentry } = await import('@/lib/sentry')
    registerSentry()
  }
}
