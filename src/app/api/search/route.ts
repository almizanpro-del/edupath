/**
 * GET /api/search?q=...
 *
 * Lightweight university search. Returns id, name, slug, country, city.
 * Used by the application tracker's add-university dialog and any other
 * autocomplete-style picker.
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()

  if (q.length < 2) {
    return NextResponse.json({ universities: [] })
  }

  try {
    const results = await db.university.findMany({
      where: {
        pendingReview: false,
        OR: [
          { name: { contains: q } },
          { city: { contains: q } },
          { country: { contains: q } },
        ],
      },
      select: { id: true, name: true, slug: true, country: true, city: true },
      take: 10,
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ universities: results })
  } catch {
    // DB unavailable — fall back to static data
    const results = (staticUniversities as Array<{
      id: string; name: string; slug: string; country: string; city: string
    }>)
      .filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        u.country.toLowerCase().includes(q)
      )
      .slice(0, 10)
      .map(u => ({ id: u.id, name: u.name, slug: u.slug, country: u.country, city: u.city }))
    return NextResponse.json({ universities: results })
  }
}
