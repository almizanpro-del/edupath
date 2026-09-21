/**
 * Admin API for managing scraped universities.
 *
 * GET  /api/admin/scraped           — list scraped records (with filters)
 * POST /api/admin/scraped           — bulk import from JSON (admin only)
 *
 * Query params:
 *   ?status=manual_review  — filter by status
 *   ?source=openalex       — filter by source
 *   ?country=Jordan        — filter by country
 *   ?q=oxford              — search by name
 *   ?limit=50              — pagination (default 50, max 200)
 *   ?offset=0              — pagination offset
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await db.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      id: true, role: true, name: true, email: true,
      country: true, fieldOfInterest: true, verificationStatus: true,
    },
  })
  return profile?.role === 'admin' ? profile : null
}

export async function GET(req: NextRequest) {
  const profile = await requireAdmin()
  if (!profile) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const source = url.searchParams.get('source')
    const country = url.searchParams.get('country')
    const q = url.searchParams.get('q')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (source) where.source = source
    if (country) where.country = country
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { normalizedName: { contains: q.toLowerCase() } },
        { city: { contains: q } },
      ]
    }

    const [records, total] = await Promise.all([
      db.scrapedUniversity.findMany({
        where,
        orderBy: [{ qualityScore: 'desc' }, { scrapedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      db.scrapedUniversity.count({ where }),
    ])

    // Summary counts by status
    const statusCounts = await db.scrapedUniversity.groupBy({
      by: ['status'],
      _count: true,
    })

    return NextResponse.json({
      records,
      total,
      limit,
      offset,
      summary: {
        byStatus: statusCounts.reduce((acc, s) => {
          acc[s.status] = s._count
          return acc
        }, {} as Record<string, number>),
      },
    })
  } catch (error) {
    console.error('[api/admin/scraped GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch scraped universities' }, { status: 500 })
  }
}
