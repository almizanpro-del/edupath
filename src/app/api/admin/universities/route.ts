/** Admin university management API
 * GET  /api/admin/universities — list all universities (with pending filter)
 * POST /api/admin/universities — create a new university
 * PATCH /api/admin/universities/[id] — update or approve a university
 * DELETE /api/admin/universities/[id] — delete a university
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  let profile = await db.user.findUnique({ where: { supabaseId: user.id } })
  if (!profile) {
    profile = await db.user.create({
      data: {
        supabaseId: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? 'Admin',
        country: user.user_metadata?.country ?? 'Jordan', role: 'student',
      },
    })
  }
  return profile.role === 'admin' ? profile : null
}

export async function GET(req: NextRequest) {
  const profile = await requireAdmin()
  if (!profile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const url = new URL(req.url)
  const pending = url.searchParams.get('pending') === 'true'
  const q = url.searchParams.get('q')

  try {
    const where: Record<string, unknown> = {}
    if (pending) where.pendingReview = true
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { country: { contains: q } },
        { city: { contains: q } },
      ]
    }
    const universities = await db.university.findMany({
      where,
      include: { _count: { select: { programs: true, scholarships: true, reviews: true } } },
      orderBy: [{ pendingReview: 'desc' }, { name: 'asc' }],
    })
    return NextResponse.json({ universities })
  } catch (dbError) {
    return NextResponse.json({ error: 'DB unavailable', universities: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  const profile = await requireAdmin()
  if (!profile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const body = await req.json()
    const { name, country, city, website, tuitionUsd, livingCostUsd, intlStudentPct, acceptanceRate, currency, descriptionEn, descriptionAr } = body
    if (!name || !country) {
      return NextResponse.json({ error: 'Name and country are required' }, { status: 400 })
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const uni = await db.university.create({
      data: { slug, name, country, city: city || '', website: website || '',
        tuitionUsd: tuitionUsd || 5000, livingCostUsd: livingCostUsd || 6000,
        intlStudentPct: intlStudentPct || 15, acceptanceRate: acceptanceRate ?? null,
        currency: currency || 'USD', descriptionEn: descriptionEn || '', descriptionAr: descriptionAr || '',
        pendingReview: false },
    })
    return NextResponse.json({ university: uni })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create university' }, { status: 500 })
  }
}
