/**
 * Reviews API.
 * GET  /api/reviews?universityId=...     — list approved reviews for a university (public)
 * GET  /api/reviews?pending=true          — list pending reviews (admin only)
 * PATCH /api/reviews                       — moderate a review (admin only)
 *   body: { reviewId: string, action: 'approve' | 'reject' }
 * POST /api/reviews — submit a new review (requires auth)
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { parseTags } from '@/lib/edupath'

async function getOrCreateProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let profile = await db.user.findUnique({
    where: { supabaseId: user.id },
  })
  if (!profile) {
    profile = await db.user.create({
      data: {
        supabaseId: user.id,
        email: user.email ?? '',
        name: (user.user_metadata?.full_name as string) ?? (user.email?.split('@')[0] ?? 'Student'),
        country: (user.user_metadata?.country as string) ?? 'Jordan',
      },
    })
  }
  return profile
}

// GET — list reviews (approved by university, OR pending for admin)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const universityId = url.searchParams.get('universityId')
  const pending = url.searchParams.get('pending') === 'true'

  // Admin path: list pending reviews across all universities
  if (pending) {
    const profile = await getOrCreateProfile()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const reviews = await db.review.findMany({
      where: { moderationStatus: 'pending' },
      include: { user: true, university: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      reviews: reviews.map(r => ({
        id: r.id,
        userName: r.user.name ?? 'Anonymous',
        userEmail: r.user.email,
        userCountry: r.user.country,
        universityId: r.universityId,
        universityName: r.university.name,
        universityCountry: r.university.country,
        ratingOverall: r.ratingOverall,
        ratingAffordability: r.ratingAffordability,
        ratingVisa: r.ratingVisa,
        ratingTeaching: r.ratingTeaching,
        ratingSafety: r.ratingSafety,
        ratingSocial: r.ratingSocial,
        reviewText: r.reviewText,
        helpfulCount: r.helpfulCount,
        verifiedEnrollment: r.verifiedEnrollment,
        moderationStatus: r.moderationStatus,
        tags: parseTags(r.tags),
        createdAt: r.createdAt.toISOString(),
      })),
    })
  }

  // Public path: list approved reviews for a specific university
  if (!universityId) {
    return NextResponse.json({ error: 'universityId query param required' }, { status: 400 })
  }
  const reviews = await db.review.findMany({
    where: { universityId, moderationStatus: 'approved' },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    reviews: reviews.map(r => ({
      id: r.id,
      userName: r.user.name ?? 'Anonymous',
      userCountry: r.user.country,
      ratingOverall: r.ratingOverall,
      ratingAffordability: r.ratingAffordability,
      ratingVisa: r.ratingVisa,
      ratingTeaching: r.ratingTeaching,
      ratingSafety: r.ratingSafety,
      ratingSocial: r.ratingSocial,
      reviewText: r.reviewText,
      helpfulCount: r.helpfulCount,
      verifiedEnrollment: r.verifiedEnrollment,
      tags: parseTags(r.tags),
      createdAt: r.createdAt.toISOString(),
    })),
  })
}

// PATCH — moderate a review (admin only)
export async function PATCH(req: NextRequest) {
  const profile = await getOrCreateProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await req.json()
  const { reviewId, action } = body
  if (!reviewId || !action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'reviewId and action (approve|reject) required' }, { status: 400 })
  }

  const updated = await db.review.update({
    where: { id: reviewId },
    data: { moderationStatus: action === 'approve' ? 'approved' : 'rejected' },
  })

  return NextResponse.json({ reviewId: updated.id, moderationStatus: updated.moderationStatus })
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
      moderationStatus: 'pending', // new reviews go to admin moderation queue
      verifiedEnrollment: profile.verificationStatus === 'verified',
      tags: JSON.stringify(cleanTags),
    },
  })

  return NextResponse.json({ reviewId: review.id, status: 'approved' })
}
