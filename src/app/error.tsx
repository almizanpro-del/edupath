'use client'

import * as React from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Error boundary for the home page.
 * Catches any unhandled client-side exceptions and shows a friendly
 * message instead of a blank white screen.
 * Also reports to Sentry if configured.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[EduPath Error Boundary]', error)
    // Report to Sentry if configured
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error)
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50/40 via-white to-white p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-lg p-8 text-center space-y-4">
        <div className="size-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <AlertTriangle className="size-8 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-600">
            An unexpected error occurred while loading EduPath. Try refreshing the page.
          </p>
        </div>
        {error.message && (
          <details className="text-left bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
            <summary className="cursor-pointer font-medium">Technical details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
            {error.digest && <p className="mt-2">Digest: {error.digest}</p>}
          </details>
        )}
        <div className="flex gap-2">
          <Button
            onClick={reset}
            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
        </div>
      </div>
    </div>
  )
}
