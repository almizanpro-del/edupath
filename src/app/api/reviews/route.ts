/**
 * Reviews API.
 * GET  /api/reviews?universityId=...     — list approved reviews for a university (public)
 * GET  /api/reviews?pending=true          — list pending reviews (admin only)
 * PATCH /api/reviews                       — moderate a review (admin only)
 *   body: { reviewId: string, action: 'approve' | 'reject' }
 * POST /api/reviews — submit a new review (requires auth)
 *
 * Returns graceful errors when DB is unavailable (Vercel without Postgres).
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { parseTags } from '@/lib/edupath'
import staticUniversities from '@/data/static-universities.json'
import { requireSameOrigin } from '@/lib/csrf'
import { reviewSchema, validateBody } from '@/lib/validation'
import { z } from 'zod'

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

// GET — list reviews (approved by university, OR pending for admin)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const universityId = url.searchParams.get('universityId')
  const pending = url.searchParams.get('pending') === 'true'

  try {
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

    try {
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
    } catch (dbError) {
      // DB unavailable — fall back to static data
      const uni = (staticUniversities as Array<{ id: string; reviews: unknown[] }>).find(u => u.id === universityId)
      return NextResponse.json({ reviews: uni?.reviews ?? [] })
    }
  } catch (error) {
    console.warn('[api/reviews GET] Error:', error)
    return NextResponse.json({ reviews: [] })
  }
}

// PATCH — moderate a review (admin only)
export async function PATCH(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    const profile = await getOrCreateProfile()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    // Validate: accept both legacy { action: 'approve'|'reject' } and new { moderationStatus }
    const validation = validateBody(
      z.object({
        reviewId: z.string().trim().min(1),
        action: z.enum(['approve', 'reject']).optional(),
        moderationStatus: z.enum(['approved', 'rejected', 'pending']).optional(),
      }),
      body
    )
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { reviewId, action, moderationStatus } = validation.data
    const finalStatus = moderationStatus ?? (action === 'approve' ? 'approved' : 'rejected')
    if (!finalStatus || !['approved', 'rejected'].includes(finalStatus)) {
      return NextResponse.json({ error: 'Invalid moderation status' }, { status: 400 })
    }

    const updated = await db.review.update({
      where: { id: reviewId },
      data: { moderationStatus: finalStatus },
    })

    // Send email notification to the reviewer when approved
    if (finalStatus === 'approved') {
      try {
        const review = await db.review.findUnique({
          where: { id: reviewId },
          include: { user: true, university: true },
        })
        if (review?.user?.email) {
          const { sendReviewApprovedEmail } = await import('@/lib/email')
          await sendReviewApprovedEmail(review.user.email, review.university.name)
        }
      } catch {
        // Email failed — don't block the approval
      }
    }

    return NextResponse.json({ reviewId: updated.id, moderationStatus: updated.moderationStatus })
  } catch (error) {
    console.warn('[api/reviews PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Review moderation requires a database connection. This feature is unavailable in demo mode.' },
      { status: 503 }
    )
  }
}

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    const profile = await getOrCreateProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const validation = validateBody(reviewSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
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
    } = validation.data

    const uni = await db.university.findUnique({
      where: { id: universityId },
      select: { id: true, name: true },
    })
    if (!uni) {
      return NextResponse.json({ error: 'University not found' }, { status: 404 })
    }

    const existing = await db.review.findFirst({
      where: { userId: profile.id, universityId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this university. Edit your existing review instead.' },
        { status: 409 }
      )
    }

    // Sanitize user input to prevent XSS (zod already validated types/sizes)
    const { sanitizeText, isSafeInput } = await import('@/lib/sanitize')
    if (!isSafeInput(reviewText)) {
      return NextResponse.json({ error: 'Invalid content in review text' }, { status: 400 })
    }
    const safeText = sanitizeText(reviewText)
    const safeTags = tags.map(t => sanitizeText(t))

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
        reviewText: safeText,
        moderationStatus: 'pending',
        verifiedEnrollment: profile.verificationStatus === 'verified',
        tags: JSON.stringify(safeTags),
      },
    })

    return NextResponse.json({ reviewId: review.id, status: 'pending' })
  } catch (error) {
    console.warn('[api/reviews POST] Error:', error)
    return NextResponse.json(
      { error: 'Review submission requires a database connection. This feature is unavailable in demo mode.' },
      { status: 503 }
    )
  }
}
