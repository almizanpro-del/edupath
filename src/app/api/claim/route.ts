/** POST /api/claim — university rep claims a university profile
 * GET /api/claim?status=pending — admin views pending claims
 * PATCH /api/claim — admin approves/rejects a claim
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'
import { claimSchema, claimPatchSchema, validateBody } from '@/lib/validation'

async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  let profile = await db.user.findUnique({
        where: { supabaseId: user.id },
        select: {
          id: true, role: true, name: true, email: true,
          country: true, fieldOfInterest: true, verificationStatus: true,
        },
      })
  if (!profile) {
    profile = await db.user.create({ data: { supabaseId: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? 'User', country: 'Jordan', role: 'student' } })
  }
  return profile
}

// POST — submit a claim
export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const body = await req.json()
    const validation = validateBody(claimSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { universityId, officialName, officialEmail, officialTitle, proofUrl } = validation.data

    const uni = await db.university.findUnique({
      where: { id: universityId },
      select: { id: true, name: true },
    })
    if (!uni) return NextResponse.json({ error: 'University not found' }, { status: 404 })

    // Store the claim as an analytics event (lightweight — no separate table needed for MVP)
    // In production, this would be a UniversityClaim model with admin review queue
    await db.analyticsEvent.create({
      data: {
        eventType: 'university_claim',
        universityId,
        userId: profile.id,
        metadata: JSON.stringify({
          officialName, officialEmail, officialTitle, proofUrl,
          claimantName: profile.name, claimantEmail: profile.email,
          universityName: uni.name, status: 'pending',
        }),
      },
    })

    return NextResponse.json({ status: 'submitted', message: 'Your claim has been submitted. We will review it within 3 business days.' })
  } catch (error) {
    console.error('[api/claim POST] Error:', error)
    return NextResponse.json({ error: 'Claim submission requires a database connection.' }, { status: 503 })
  }
}

// GET — admin views pending claims
export async function GET() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const claims = await db.analyticsEvent.findMany({
      where: { eventType: 'university_claim' },
      include: { university: { select: { name: true, slug: true, country: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const parsed = claims
      .filter(c => c.university !== null)
      .map(c => {
        const meta = JSON.parse(c.metadata)
        const uni = c.university!
        return {
          id: c.id,
          universityId: c.universityId,
          universityName: uni.name,
          universitySlug: uni.slug,
          universityCountry: uni.country,
          claimantName: meta.claimantName,
          claimantEmail: meta.claimantEmail,
          officialName: meta.officialName,
          officialEmail: meta.officialEmail,
          officialTitle: meta.officialTitle,
          proofUrl: meta.proofUrl,
          status: meta.status,
          submittedAt: c.createdAt.toISOString(),
        }
    })

    return NextResponse.json({ claims: parsed })
  } catch {
    return NextResponse.json({ claims: [] })
  }
}

// PATCH — admin approves/rejects a claim
export async function PATCH(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { claimId, action } = body // action: 'approve' | 'reject'

    if (!claimId || !action) {
      return NextResponse.json({ error: 'claimId and action required' }, { status: 400 })
    }

    const event = await db.analyticsEvent.findUnique({ where: { id: claimId } })
    if (!event || event.eventType !== 'university_claim') {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    const meta = JSON.parse(event.metadata)

    if (action === 'approve') {
      // Update the claim status
      meta.status = 'approved'
      await db.analyticsEvent.update({
        where: { id: claimId },
        data: { metadata: JSON.stringify(meta) },
      })

      // Promote the user to recruiter role
      await db.user.update({
        where: { id: event.userId! },
        data: { role: 'recruiter', fieldOfInterest: event.universityId },
      })

      return NextResponse.json({ status: 'approved', message: 'University profile claimed. User promoted to recruiter.' })
    } else {
      meta.status = 'rejected'
      await db.analyticsEvent.update({
        where: { id: claimId },
        data: { metadata: JSON.stringify(meta) },
      })
      return NextResponse.json({ status: 'rejected' })
    }
  } catch (error) {
    console.error('[api/claim PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to process claim' }, { status: 500 })
  }
}
