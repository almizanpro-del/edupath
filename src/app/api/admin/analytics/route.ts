/** GET /api/admin/analytics — platform-wide metrics for admin dashboard */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { isStripeConfigured, TIERS } from '@/lib/stripe'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    let profile = await db.user.findUnique({ where: { supabaseId: user.id } })
    if (!profile) {
      profile = await db.user.create({ data: { supabaseId: user.id, email: user.email ?? '', name: 'Admin', country: 'Jordan', role: 'student' } })
    }
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  } catch {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })
  }

  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // User metrics
    const totalUsers = await db.user.count()
    const newUsers30d = await db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    const newUsers7d = await db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } })

    // University metrics
    const totalUniversities = await db.university.count()
    const pendingReview = await db.university.count({ where: { pendingReview: true } })

    // Program + scholarship
    const totalPrograms = await db.program.count()
    const totalScholarships = await db.scholarship.count()

    // Review metrics
    const totalReviews = await db.review.count()
    const pendingReviews = await db.review.count({ where: { moderationStatus: 'pending' } })
    const approvedReviews = await db.review.count({ where: { moderationStatus: 'approved' } })

    // Lead metrics
    const totalLeads = await db.lead.count()
    const newLeads7d = await db.lead.count({ where: { createdAt: { gte: sevenDaysAgo } } })
    const newLeads30d = await db.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } })

    // Subscription metrics
    const activeSubs = await db.subscription.count({ where: { status: 'active' } })
    const subscriptions = await db.subscription.findMany({ where: { status: 'active' } })
    const revenueByTier: Record<string, { count: number; mrr: number }> = {}
    for (const sub of subscriptions) {
      const tier = TIERS.find(t => t.id === sub.tier)
      if (!revenueByTier[sub.tier]) revenueByTier[sub.tier] = { count: 0, mrr: 0 }
      revenueByTier[sub.tier].count++
      revenueByTier[sub.tier].mrr += tier?.price ?? 0
    }
    const totalMRR = Object.values(revenueByTier).reduce((s, t) => s + t.mrr, 0)

    // Analytics events (last 30 days)
    const events = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { eventType: true, createdAt: true, universityId: true },
    })

    const eventsByType: Record<string, number> = {}
    const eventsByDay: Record<string, number> = {}
    const universityViews: Record<string, number> = {}

    for (const e of events) {
      eventsByType[e.eventType] = (eventsByType[e.eventType] ?? 0) + 1
      const day = e.createdAt.toISOString().slice(0, 10)
      eventsByDay[day] = (eventsByDay[day] ?? 0) + 1
      if (e.eventType === 'university_view' && e.universityId) {
        universityViews[e.universityId] = (universityViews[e.universityId] ?? 0) + 1
      }
    }

    // Top 10 universities by views
    const topUniversityIds = Object.entries(universityViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    const topUniversities: Array<{ name: string; slug: string; country: string; views: number }> = []
    for (const [id, views] of topUniversityIds) {
      const uni = await db.university.findUnique({ where: { id }, select: { name: true, slug: true, country: true } })
      if (uni) topUniversities.push({ ...uni, views })
    }

    // Daily event trend (last 14 days)
    const dailyTrend: Array<{ date: string; count: number }> = []
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().slice(0, 10)
      dailyTrend.push({ date: dateStr, count: eventsByDay[dateStr] ?? 0 })
    }

    return NextResponse.json({
      users: { total: totalUsers, new30d: newUsers30d, new7d: newUsers7d },
      universities: { total: totalUniversities, pendingReview },
      content: { programs: totalPrograms, scholarships: totalScholarships, reviews: totalReviews, pendingReviews, approvedReviews },
      leads: { total: totalLeads, new7d: newLeads7d, new30d: newLeads30d },
      revenue: {
        activeSubscriptions: activeSubs,
        totalMRR,
        byTier: revenueByTier,
        stripeConfigured: isStripeConfigured(),
      },
      events: {
        total30d: events.length,
        byType: eventsByType,
        dailyTrend,
        topUniversities,
      },
    })
  } catch (error) {
    console.error('[admin/analytics] Error:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
