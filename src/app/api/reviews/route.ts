/**
 * Reviews API.
 * POST /api/reviews — submit a new review (requires auth)
 *   body: {
 *     universityId: string,
 *     ratingOverall: number, ratingAffordability: number, ratingVisa: number,
 *     ratingTeaching: number, ratingSafety: number, ratingSocial: number,
 *     reviewText: string,
 *     tags: string[]
 *   }
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

async function getOrCreateProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let profile = await db.user.findUnique({
    where: { supabaseId: user.id },
  })
  if (!profile) {
    profile = await db.user.create({
      data: {
        supabaseId: user.id,
        email: user.email ?? '',
        name:
          (user.user_metadata?.full_name as string) ??
          (user.email?.split('@')[0] ?? 'Student'),
        country: (user.user_metadata?.country as string) ?? 'Jordan',
      },
    })
  }
  return profile
}

export async function POST(req: NextRequest) {
  const profile = await getOrCreateProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const {
    universityId,
    ratingOverall,
    ratingAffordability,
    ratingVisa,
    ratingTeaching,
    ratingSafety,
    ratingSocial,
    reviewText,
    tags = [],
  } = body

  // Validation
  if (!universityId || typeof universityId !== 'string') {
    return NextResponse.json({ error: 'universityId required' }, { status: 400 })
  }
  if (!reviewText || reviewText.trim().length < 20) {
    return NextResponse.json({ error: 'Review text must be at least 20 characters' }, { status: 400 })
  }
  for (const r of [ratingOverall, ratingAffordability, ratingVisa, ratingTeaching, ratingSafety, ratingSocial]) {
    if (typeof r !== 'number' || r < 1 || r > 5) {
      return NextResponse.json({ error: 'All ratings must be 1-5' }, { status: 400 })
    }
  }

  // Ensure university exists
  const uni = await db.university.findUnique({ where: { id: universityId } })
  if (!uni) {
    return NextResponse.json({ error: 'University not found' }, { status: 404 })
  }

  // Anti-spam: max 1 review per user per university
  const existing = await db.review.findFirst({
    where: { userId: profile.id, universityId },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'You have already reviewed this university. Edit your existing review instead.' },
      { status: 409 }
    )
  }

  // Length cap
  const cleanText = reviewText.trim().slice(0, 5000)
  const cleanTags = (tags as string[]).slice(0, 8).map(t => t.slice(0, 40))

  const review = await db.review.create({
    data: {
      userId: profile.id,
      universityId,
      ratingOverall,
      ratingAffordability,
      ratingVisa,
      ratingTeaching,
      ratingSafety,
      ratingSocial,
      reviewText: cleanText,
      moderationStatus: 'approved', // auto-approve for MVP demo; production: 'pending' for admin review
      verifiedEnrollment: profile.verificationStatus === 'verified',
      tags: JSON.stringify(cleanTags),
    },
  })

  return NextResponse.json({ reviewId: review.id, status: 'approved' })
}
