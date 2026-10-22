'use client'

/**
 * PostHog provider — properly initializes the PostHog JS SDK on the client.
 *
 * Before Phase 3, the codebase called window.posthog.capture() but never
 * loaded the PostHog script, so all client-side analytics were a no-op.
 * This component fixes that by initializing PostHog once on mount.
 *
 * Respects the user's cookie consent choice — only initializes if the
 * user has accepted analytics cookies (checked via localStorage).
 *
 * Set NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST env vars to
 * enable. Without them, this component is a no-op.
 */
import * as React from 'react'
import posthog from 'posthog-js'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (!POSTHOG_KEY) return

    // Respect cookie consent — only init if the user accepted analytics.
    const consent = localStorage.getItem('edupath-cookie-consent')
    if (consent !== 'accepted') return

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only', // only track identified users
      persistence: 'localStorage+cookie',
      autocapture: false, // we capture events manually for precision
      disable_session_recording: true, // enable later if needed
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug()
      },
    })

    // Listen for consent changes and opt in/out accordingly
    const handleConsentChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === 'accepted') {
        posthog.opt_in_capturing()
      } else {
        posthog.opt_out_capturing()
      }
    }
    window.addEventListener('edupath:cookie-consent', handleConsentChange)

    return () => {
      window.removeEventListener('edupath:cookie-consent', handleConsentChange)
    }
  }, [])

  return <>{children}</>
}
