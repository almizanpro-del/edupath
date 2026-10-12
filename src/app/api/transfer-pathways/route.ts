/** GET /api/transfer-pathways — list transfer pathways
 * Query params:
 *   ?from=ID        — filter by source university ID
 *   ?to=ID          — filter by destination university ID
 *   ?fromCountry=X  — filter by source country
 *   ?toCountry=X    — filter by destination country
 *   ?field=X        — filter by field of study (matches university programs)
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import staticPathways from '@/data/static-pathways.json'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const fromId = url.searchParams.get('from')
  const toId = url.searchParams.get('to')
  const fromCountry = url.searchParams.get('fromCountry')
  const toCountry = url.searchParams.get('toCountry')

  try {
    const where: Record<string, unknown> = {}
    if (fromId) where.fromUniversityId = fromId
    if (toId) where.toUniversityId = toId

    let pathways = await db.transferPathway.findMany({
      where,
      include: {
        fromUniversity: { select: { id: true, name: true, slug: true, country: true, city: true, tuitionUsd: true, livingCostUsd: true } },
        toUniversity: { select: { id: true, name: true, slug: true, country: true, city: true, tuitionUsd: true, livingCostUsd: true } },
      },
      orderBy: { estimatedSavingsUsd: 'desc' },
    })

    // Apply country filters (can't do in Prisma easily without nested where)
    if (fromCountry) {
      pathways = pathways.filter(p => p.fromUniversity.country.toLowerCase() === fromCountry.toLowerCase())
    }
    if (toCountry) {
      pathways = pathways.filter(p => p.toUniversity.country.toLowerCase() === toCountry.toLowerCase())
    }

    return NextResponse.json({ pathways, source: 'database' })
  } catch (dbError) {
    console.warn('[api/transfer-pathways] DB unavailable, using static fallback')
    let filtered = staticPathways as Array<Record<string, unknown>>

    if (fromId) {
      filtered = filtered.filter(p => (p.fromUniversity as { id: string }).id === fromId)
    }
    if (toId) {
      filtered = filtered.filter(p => (p.toUniversity as { id: string }).id === toId)
    }
    if (fromCountry) {
      filtered = filtered.filter(p =>
        (p.fromUniversity as { country: string }).country.toLowerCase() === fromCountry.toLowerCase()
      )
    }
    if (toCountry) {
      filtered = filtered.filter(p =>
        (p.toUniversity as { country: string }).country.toLowerCase() === toCountry.toLowerCase()
      )
    }

    return NextResponse.json({ pathways: filtered, source: 'static' })
  }
}
