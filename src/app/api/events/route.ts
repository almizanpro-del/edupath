/**
 * POST /api/events
 * Client-side event tracking endpoint.
 * Called from the browser to track: university views, searches, comparisons, etc.
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { trackEvent } from '@/lib/analytics'
import { requireSameOrigin } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'
import { eventSchema, validateBody } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  // Rate limit: 30 events per minute per IP (prevents DB pollution)
  const limited = rateLimit(req, { windowMs: 60_000, max: 30, prefix: 'events' })
  if (limited) return limited

  try {
    const body = await req.json()
    const validation = validateBody(eventSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { eventType, universityId, metadata } = validation.data

    // Get user if authenticated (optional — events can be anonymous)
    let userId: string | undefined
    let country: string | undefined
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        const profile = await db.user.findUnique({
          where: { supabaseId: user.id },
          select: { country: true },
        })
        country = profile?.country
      }
    } catch {
      // Auth unavailable — track anonymously
    }

    // Generate or reuse session ID
    const sessionId = (typeof body.sessionId === 'string' && body.sessionId.length < 100)
      ? body.sessionId
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Cap metadata size to 4 KB to prevent DB bloat
    const safeMetadata = metadata
      ? JSON.stringify(metadata).slice(0, 4096)
      : undefined
    const parsedMetadata = safeMetadata ? JSON.parse(safeMetadata) : undefined

    await trackEvent({
      eventType,
      universityId: universityId ?? undefined,
      userId,
      sessionId,
      country,
      metadata: parsedMetadata,
    })

    return NextResponse.json({ success: true, sessionId })
  } catch (error) {
    console.warn('[api/events] Error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
