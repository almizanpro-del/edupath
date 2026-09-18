/** Sponsor dashboard API
 * GET /api/sponsor — analytics + leads for the sponsor's university
 *
 * Sponsor = user with role 'recruiter' linked to a university.
 * For MVP demo, we return mock analytics data based on the university's
 * real data (reviews, programs, etc.) plus simulated view/lead metrics.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let profile
  try {
    profile = await db.user.findUnique({ where: { supabaseId: user.id } })
    if (!profile) {
      profile = await db.user.create({
        data: { supabaseId: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? 'Sponsor', country: 'Jordan', role: 'student' },
      })
    }
  } catch {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })
  }

  if (profile.role !== 'recruiter' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Sponsor access required' }, { status: 403 })
  }

  // For MVP: recruiters can view analytics for ALL universities (in production,
  // each recruiter would be linked to a specific university via a sponsor relation).
  // Admins can also view this dashboard.

  try {
    const universities = await db.university.findMany({
      where: { pendingReview: false },
      include: {
        reviews: { where: { moderationStatus: 'approved' }, select: { ratingOverall: true, ratingAffordability: true, ratingTeaching: true, ratingVisa: true, ratingSafety: true, ratingSocial: true } },
        _count: { select: { programs: true, scholarships: true, reviews: true } },
      },
      orderBy: { name: 'asc' },
    })

    // Compute analytics per university
    const analytics = universities.map(u => {
      const reviews = u.reviews
      const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingOverall, 0) / reviews.length : 0
      const avgAffordability = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingAffordability, 0) / reviews.length : 0
      const avgTeaching = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingTeaching, 0) / reviews.length : 0
      const avgVisa = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingVisa, 0) / reviews.length : 0
      const avgSafety = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingSafety, 0) / reviews.length : 0
      const avgSocial = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingSocial, 0) / reviews.length : 0

      // Simulated metrics (in production, track via PostHog or analytics events)
      const seed = u.id.charCodeAt(0) + u.id.charCodeAt(1)
      const profileViews = Math.floor(50 + (seed % 500))
      const uniqueVisitors = Math.floor(profileViews * 0.7)
      const comparisonAppearances = Math.floor(profileViews * 0.3)
      const saveCount = Math.floor(profileViews * 0.1)
      const clickThroughRate = (2 + (seed % 5)).toFixed(1)

      // Sentiment analysis from review ratings
      const sentimentScore = reviews.length > 0 ? ((avgRating / 5) * 100).toFixed(0) : 'N/A'

      return {
        id: u.id,
        name: u.name,
        slug: u.slug,
        country: u.country,
        city: u.city,
        tuitionUsd: u.tuitionUsd,
        programCount: u._count.programs,
        scholarshipCount: u._count.scholarships,
        reviewCount: u._count.reviews,
        avgRating: avgRating.toFixed(1),
        sentiment: {
          overall: avgRating.toFixed(1),
          affordability: avgAffordability.toFixed(1),
          teaching: avgTeaching.toFixed(1),
          visa: avgVisa.toFixed(1),
          safety: avgSafety.toFixed(1),
          social: avgSocial.toFixed(1),
          sentimentScore,
        },
        metrics: {
          profileViews,
          uniqueVisitors,
          comparisonAppearances,
          saveCount,
          clickThroughRate,
        },
      }
    })

    // Simulated leads (in production, stored in DB from contact form submissions)
    const leads = [
      { id: 'lead-1', studentName: 'Fatima A.', country: 'Jordan', gpa: 3.7, field: 'Computer Science', message: 'Interested in BSc Computer Science for Fall 2026. What scholarships are available?', date: '2026-09-15', status: 'new' },
      { id: 'lead-2', studentName: 'Ahmed H.', country: 'Egypt', gpa: 3.5, field: 'Engineering', message: 'Looking for transfer options. I have 60 credits completed. Can these transfer?', date: '2026-09-14', status: 'new' },
      { id: 'lead-3', studentName: 'Layla M.', country: 'UAE', gpa: 3.8, field: 'Business', message: 'I would like to know more about the MBA program and application deadlines.', date: '2026-09-12', status: 'contacted' },
      { id: 'lead-4', studentName: 'Omar K.', country: 'Saudi Arabia', gpa: 3.2, field: 'Medicine', message: 'What are the English language requirements for international students?', date: '2026-09-10', status: 'closed' },
    ]

    return NextResponse.json({
      analytics,
      leads,
      totalUniversities: analytics.length,
      totalProfileViews: analytics.reduce((s, a) => s + a.metrics.profileViews, 0),
      totalLeads: leads.length,
      totalNewLeads: leads.filter(l => l.status === 'new').length,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
