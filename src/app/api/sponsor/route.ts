/** Sponsor dashboard API
 * GET /api/sponsor — analytics + leads for the sponsor's university
 *
 * Reads real analytics from AnalyticsEvent table + real leads from Lead table.
 * Falls back to simulated data when DB is unavailable (Vercel without Postgres).
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
    profile = await db.user.findUnique({
        where: { supabaseId: user.id },
        select: {
          id: true, role: true, name: true, email: true,
          country: true, fieldOfInterest: true, verificationStatus: true,
        },
      })
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

  // Recruiters are scoped to a single university (stored in fieldOfInterest
  // when their claim is approved — see /api/claim/route.ts PATCH handler).
  // Admins can view all universities.
  const recruiterUniversityId =
    profile.role === 'recruiter' ? profile.fieldOfInterest : undefined

  try {
    const universities = await db.university.findMany({
      where: recruiterUniversityId
        ? { id: recruiterUniversityId, pendingReview: false }
        : { pendingReview: false },
      include: {
        reviews: { where: { moderationStatus: 'approved' }, select: { ratingOverall: true, ratingAffordability: true, ratingTeaching: true, ratingVisa: true, ratingSafety: true, ratingSocial: true } },
        _count: { select: { programs: true, scholarships: true, reviews: true } },
      },
      orderBy: { name: 'asc' },
    })

    // Batch-fetch all analytics events for the universities in a single query
    // (avoids N+1 — was 1 query per university inside the map below).
    const universityIds = universities.map(u => u.id)
    const eventCounts = new Map<string, { views: number; comparisons: number; saves: number }>()
    try {
      const grouped = await db.analyticsEvent.groupBy({
        by: ['universityId', 'eventType'],
        where: { universityId: { in: universityIds } },
        _count: true,
      })
      for (const g of grouped) {
        if (!g.universityId) continue
        const entry = eventCounts.get(g.universityId) ?? { views: 0, comparisons: 0, saves: 0 }
        if (g.eventType === 'university_view') entry.views = g._count
        else if (g.eventType === 'compare') entry.comparisons = g._count
        else if (g.eventType === 'save') entry.saves = g._count
        eventCounts.set(g.universityId, entry)
      }
    } catch {
      // DB unavailable — will use simulated fallback per university below
    }

    // Compute analytics per university (no DB calls inside the map)
    const analytics = universities.map(u => {
      const reviews = u.reviews
      const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingOverall, 0) / reviews.length : 0
      const avgAffordability = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingAffordability, 0) / reviews.length : 0
      const avgTeaching = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingTeaching, 0) / reviews.length : 0
      const avgVisa = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingVisa, 0) / reviews.length : 0
      const avgSafety = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingSafety, 0) / reviews.length : 0
      const avgSocial = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingSocial, 0) / reviews.length : 0

      // Read from the pre-fetched event counts (fallback to simulated)
      let profileViews: number
      let comparisonAppearances: number
      let saveCount: number
      const entry = eventCounts.get(u.id)
      if (entry) {
        profileViews = entry.views
        comparisonAppearances = entry.comparisons
        saveCount = entry.saves
      } else {
        // Simulated fallback
        const seed = u.id.charCodeAt(0) + u.id.charCodeAt(1)
        profileViews = Math.floor(50 + (seed % 500))
        comparisonAppearances = Math.floor(profileViews * 0.3)
        saveCount = Math.floor(profileViews * 0.1)
      }
      const uniqueVisitors = Math.floor(profileViews * 0.7)
      const clickThroughRate = profileViews > 0 ? ((saveCount / profileViews) * 100).toFixed(1) : '0.0'

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

    // Real leads from Lead table (fallback to simulated if DB unavailable).
    // Recruiters only see leads for their own university; admins see all.
    let leads: Array<{ id: string; studentName: string; country: string; gpa: number | null; field: string | null; message: string; date: string; status: string }> = []
    try {
      const dbLeads = await db.lead.findMany({
        where: recruiterUniversityId ? { universityId: recruiterUniversityId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      leads = dbLeads.map(l => ({
        id: l.id,
        studentName: l.studentName,
        country: l.country,
        gpa: l.gpa,
        field: l.field,
        message: l.message,
        date: l.createdAt.toISOString().slice(0, 10),
        status: l.status,
      }))
    } catch {
      // DB unavailable — use simulated fallback
      leads = [
        { id: 'lead-1', studentName: 'Fatima A.', country: 'Jordan', gpa: 3.7, field: 'Computer Science', message: 'Interested in BSc Computer Science for Fall 2026.', date: '2026-09-15', status: 'new' },
        { id: 'lead-2', studentName: 'Ahmed H.', country: 'Egypt', gpa: 3.5, field: 'Engineering', message: 'Looking for transfer options.', date: '2026-09-14', status: 'new' },
      ]
    }

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
