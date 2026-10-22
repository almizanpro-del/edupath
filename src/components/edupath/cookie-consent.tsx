'use client'

/**
 * Cookie consent banner.
 *
 * Shows on first visit (and on every visit until the user makes a choice).
 * Stores the choice in localStorage under `edupath-cookie-consent`.
 *
 * Choices:
 *   - "accepted": analytics cookies are allowed
 *   - "declined": only strictly-necessary cookies are set
 *   - "dismissed": user closed the banner without choosing — treated as
 *                  "declined" for analytics purposes
 *
 * On accept, fires a window event that the analytics loader listens for
 * to dynamically inject PostHog (or any future analytics SDK).
 *
 * Design: bottom-anchored card with two buttons. Mobile-friendly.
 * RTL-aware (uses `dir="auto"` on the text).
 */
import * as React from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'edupath-cookie-consent'
const EVENT_NAME = 'edupath:cookie-consent'

export type ConsentChoice = 'accepted' | 'declined'

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'accepted'
}

export function CookieConsent() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    // Only show after a brief delay so it doesn't fight the initial paint.
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const choose = React.useCallback((choice: ConsentChoice) => {
    localStorage.setItem(STORAGE_KEY, choice)
    setVisible(false)
    // Notify any listeners (analytics loader, etc.)
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: choice }))
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[60] p-4 pointer-events-none"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="max-w-3xl mx-auto pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="hidden sm:flex size-10 rounded-lg bg-blue-50 dark:bg-blue-950 items-center justify-center shrink-0">
            <Cookie className="size-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm mb-1">
              We use cookies to improve your experience
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed" dir="auto">
              We use strictly-necessary cookies for authentication and language preference.
              With your permission, we also use analytics cookies to understand how students
              use EduPath so we can improve it.{' '}
              <Link href="/cookies" className="text-blue-600 hover:underline">
                Read our Cookie Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => choose('declined')}
              className="w-full sm:w-auto"
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => choose('accepted')}
              className="w-full sm:w-auto"
            >
              Accept all
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
