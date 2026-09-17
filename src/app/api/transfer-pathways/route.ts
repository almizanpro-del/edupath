/** GET /api/transfer-pathways?from=ID&to=ID — list transfer pathways */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import staticPathways from '@/data/static-pathways.json'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const fromId = url.searchParams.get('from')
  const toId = url.searchParams.get('to')

  try {
    const where: Record<string, unknown> = {}
    if (fromId) where.fromUniversityId = fromId
    if (toId) where.toUniversityId = toId

    const pathways = await db.transferPathway.findMany({
      where,
      include: {
        fromUniversity: { select: { id: true, name: true, slug: true, country: true, city: true, tuitionUsd: true, livingCostUsd: true } },
        toUniversity: { select: { id: true, name: true, slug: true, country: true, city: true, tuitionUsd: true, livingCostUsd: true } },
      },
      orderBy: { estimatedSavingsUsd: 'desc' },
    })

    return NextResponse.json({ pathways })
  } catch (dbError) {
    console.warn('[api/transfer-pathways] DB unavailable, using static fallback')
    let filtered = staticPathways as Array<Record<string, unknown>>
    if (fromId) filtered = filtered.filter(p => (p.fromUniversity as { id: string }).id === fromId)
    if (toId) filtered = filtered.filter(p => (p.toUniversity as { id: string }).id === toId)
    return NextResponse.json({ pathways: filtered })
  }
}
