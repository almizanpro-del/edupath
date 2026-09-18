'use client'

/**
 * Client-side analytics tracking hook.
 * Provides a track() function that sends events to /api/events.
 * Works without PostHog — all events are stored in the DB.
 */

const SESSION_KEY = 'edupath_session_id'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function track(
  eventType: string,
  options?: {
    universityId?: string
    metadata?: Record<string, unknown>
  }
) {
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()

  // Fire and forget — don't block the UI
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType,
      universityId: options?.universityId,
      sessionId,
      metadata: options?.metadata,
    }),
  }).catch(() => {
    // Silently fail — analytics should never break the UX
  })

  // Also send to PostHog if configured (client-side)
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (posthogKey && typeof window !== 'undefined') {
    try {
      // Use the global posthog instance if loaded
      const ph = (window as unknown as { posthog?: { capture: (event: string, props?: Record<string, unknown>) => void } }).posthog
      if (ph) {
        ph.capture(eventType, {
          universityId: options?.universityId,
          ...options?.metadata,
        })
      }
    } catch {
      // PostHog not loaded — skip
    }
  }
}
