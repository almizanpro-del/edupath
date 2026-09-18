/**
 * Server-side analytics tracking.
 * Dual-writes to both the DB (AnalyticsEvent table) and PostHog (if configured).
 * Works without PostHog — DB tracking always works.
 */
import { db } from '@/lib/db'

export type EventType =
  | 'university_view'
  | 'search'
  | 'compare'
  | 'save'
  | 'unsave'
  | 'essay_review'
  | 'scholarship_match'
  | 'transfer_view'
  | 'contact_form'
  | 'locale_change'
  | 'google_signin'
  | 'email_signin'
  | 'signup'

type TrackParams = {
  eventType: EventType
  universityId?: string
  userId?: string
  sessionId?: string
  country?: string
  metadata?: Record<string, unknown>
}

/**
 * Track an analytics event. Always writes to DB; also sends to PostHog if configured.
 * Never throws — analytics failures are logged but don't break the user experience.
 */
export async function trackEvent(params: TrackParams): Promise<void> {
  // 1. Always write to DB
  try {
    await db.analyticsEvent.create({
      data: {
        eventType: params.eventType,
        universityId: params.universityId ?? null,
        userId: params.userId ?? null,
        sessionId: params.sessionId ?? null,
        country: params.country ?? null,
        metadata: JSON.stringify(params.metadata ?? {}),
      },
    })
  } catch (error) {
    // DB might be unavailable (Vercel without Postgres) — silently skip
    console.warn('[analytics] DB tracking failed:', error)
  }

  // 2. PostHog (if configured) — fire and forget
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
  if (posthogKey) {
    try {
      // Use PostHog's ingest API directly (no SDK needed server-side)
      await fetch(`${posthogHost}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: posthogKey,
          event: params.eventType,
          distinct_id: params.userId || params.sessionId || 'anonymous',
          properties: {
            universityId: params.universityId,
            country: params.country,
            ...params.metadata,
            $lib: 'edupath-server',
          },
        }),
      })
    } catch {
      // PostHog failed — not critical
    }
  }
}

/**
 * Get analytics summary for the sponsor dashboard.
 * Returns real data from the AnalyticsEvent table.
 */
export async function getAnalyticsSummary() {
  try {
    // Total events by type (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const events = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { eventType: true, universityId: true, createdAt: true },
    })

    // Aggregate by event type
    const byType: Record<string, number> = {}
    const byUniversity: Record<string, { views: number; saves: number; comparisons: number }> = {}

    for (const e of events) {
      byType[e.eventType] = (byType[e.eventType] ?? 0) + 1
      if (e.universityId) {
        if (!byUniversity[e.universityId]) {
          byUniversity[e.universityId] = { views: 0, saves: 0, comparisons: 0 }
        }
        if (e.eventType === 'university_view') byUniversity[e.universityId].views++
        if (e.eventType === 'save') byUniversity[e.universityId].saves++
        if (e.eventType === 'compare') byUniversity[e.universityId].comparisons++
      }
    }

    return {
      totalEvents: events.length,
      byType,
      byUniversity,
      period: '30d',
    }
  } catch {
    return null
  }
}
