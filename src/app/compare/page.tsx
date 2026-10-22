/**
 * /compare
 *
 * Dedicated comparison page. Reads university IDs from URL query params
 * (?ids=slug1,slug2,slug3) and renders a side-by-side comparison table.
 *
 * Also works without params — shows a search interface to pick
 * universities to compare.
 */
import { Metadata } from 'next'
import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import { CompareClient } from './compare-client'

export const metadata: Metadata = {
  title: 'Compare Universities — Side by Side',
  description: 'Compare tuition, programs, scholarships, reviews, and living costs of up to 3 universities side by side.',
  alternates: { canonical: '/compare' },
}

export const dynamic = 'force-dynamic'

type CompareUniversity = {
  id: string
  slug: string
  name: string
  country: string
  city: string
  website: string
  tuitionUsd: number
  livingCostUsd: number
  intlStudentPct: number
  acceptanceRate: number | null
  descriptionEn: string | null
  programs: Array<{
    id: string
    name: string
    degreeLevel: string
    field: string
    tuitionUsd: number
    language: string
    durationMonths: number
    deadline: string | null
  }>
  scholarships: Array<{
    id: string
    name: string
    amountUsd: number
    amountType: string
    deadline: string | null
  }>
  reviews: Array<{ ratingOverall: number }>
}

type Props = { searchParams: Promise<{ ids?: string }> }

export default async function ComparePage({ searchParams }: Props) {
  const { ids } = await searchParams
  const slugs = ids ? ids.split(',').filter(Boolean).slice(0, 3) : []

  let selected: CompareUniversity[] = []

  if (slugs.length > 0) {
    try {
      const dbUnis = await db.university.findMany({
        where: { slug: { in: slugs }, pendingReview: false },
        include: {
          programs: { select: { id: true, name: true, degreeLevel: true, field: true, tuitionUsd: true, language: true, durationMonths: true, deadline: true } },
          scholarships: { select: { id: true, name: true, amountUsd: true, amountType: true, deadline: true } },
          reviews: { where: { moderationStatus: 'approved' }, select: { ratingOverall: true } },
        },
      })
      selected = dbUnis.map(u => ({
        ...u,
        reviews: u.reviews.map(r => ({ ratingOverall: r.ratingOverall })),
      }))
    } catch {
      // DB unavailable — use static data
      selected = (staticUniversities as CompareUniversity[])
        .filter(u => slugs.includes(u.slug))
    }
  }

  // Get all universities for the picker (DB or static)
  let allUniversities: Array<{ slug: string; name: string; country: string; city: string; tuitionUsd: number }> = []
  try {
    allUniversities = await db.university.findMany({
      where: { pendingReview: false },
      select: { slug: true, name: true, country: true, city: true, tuitionUsd: true },
      orderBy: { name: 'asc' },
    })
  } catch {
    allUniversities = (staticUniversities as Array<{
      slug: string; name: string; country: string; city: string; tuitionUsd: number
    }>).map(u => ({
      slug: u.slug, name: u.name, country: u.country, city: u.city, tuitionUsd: u.tuitionUsd,
    }))
  }

  return <CompareClient selected={selected} allUniversities={allUniversities} />
}
