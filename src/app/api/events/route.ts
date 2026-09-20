/**
 * POST /api/events
 * Client-side event tracking endpoint.
 * Called from the browser to track: university views, searches, comparisons, etc.
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { trackEvent, type EventType } from '@/lib/analytics'
import { requireSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    const body = await req.json()
    const { eventType, universityId, metadata } = body

    if (!eventType) {
      return NextResponse.json({ error: 'eventType required' }, { status: 400 })
    }

    // Get user if authenticated (optional — events can be anonymous)
    let userId: string | undefined
    let country: string | undefined
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        const profile = await db.user.findUnique({ where: { supabaseId: user.id } })
        country = profile?.country
      }
    } catch {
      // Auth unavailable — track anonymously
    }

    // Generate or reuse session ID
    const sessionId = body.sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    await trackEvent({
      eventType: eventType as EventType,
      universityId,
      userId,
      sessionId,
      country,
      metadata,
    })

    return NextResponse.json({ success: true, sessionId })
  } catch (error) {
    console.warn('[api/events] Error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
