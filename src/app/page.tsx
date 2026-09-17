/**
 * EduPath - University discovery and comparison for MENA students.
 * Single-page app: hero + filters + directory + detail modal + comparison.
 *
 * This page tries the database first (works in local dev with SQLite, or in
 * production with Postgres). If the DB is unavailable (e.g., Vercel without
 * a DATABASE_URL, or connection failure), it falls back to a static JSON
 * file bundled into the build. This guarantees the directory always renders.
 */
import { db } from '@/lib/db'
import { COUNTRIES } from '@/lib/edupath'
import { EduPathApp } from '@/components/edupath/edupath-app'
import { parseTags } from '@/lib/edupath'
import staticUniversities from '@/data/static-universities.json'

type UniversityWithStats = {
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
  currency: string
  logoUrl: string | null
  descriptionEn: string
  descriptionAr: string
  programs: Array<{
    id: string
    name: string
    degreeLevel: string
    field: string
    durationMonths: number
    language: string
    tuitionUsd: number
    deadline: string | null
    entryReqs: string | null
  }>
  scholarships: Array<{
    id: string
    name: string
    amountUsd: number
    amountType: string
    eligibility: string
    deadline: string | null
  }>
  reviews: Array<{
    id: string
    userName: string
    userCountry: string
    ratingOverall: number
    ratingAffordability: number
    ratingVisa: number
    ratingTeaching: number
    ratingSafety: number
    ratingSocial: number
    reviewText: string
    helpfulCount: number
    verifiedEnrollment: boolean
    tags: string[]
    createdAt: string
  }>
  avgRating: number | null
  reviewCount: number
  cheapestProgramTuition: number
}

// Force dynamic rendering so the locale cookie is read per-request.
// Still works on Vercel — the fallback is synchronous, no DB needed.
export const dynamic = 'force-dynamic'

export default async function Home() {
  let universitiesWithStats: UniversityWithStats[] = []

  try {
    // Try the database first (local SQLite or production Postgres)
    const universities = await db.university.findMany({
      include: {
        programs: true,
        scholarships: true,
        reviews: {
          where: { moderationStatus: 'approved' },
          include: { user: true },
        },
      },
      orderBy: [{ name: 'asc' }],
    })

    universitiesWithStats = universities.map(u => {
      const reviews = u.reviews
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.ratingOverall, 0) / reviews.length
        : null
      const cheapestProgram = u.programs.length > 0
        ? u.programs.reduce((min, p) => p.tuitionUsd < min.tuitionUsd ? p : min, u.programs[0])
        : null
      return {
        id: u.id,
        slug: u.slug,
        name: u.name,
        country: u.country,
        city: u.city,
        website: u.website,
        tuitionUsd: u.tuitionUsd,
        livingCostUsd: u.livingCostUsd,
        intlStudentPct: u.intlStudentPct,
        acceptanceRate: u.acceptanceRate,
        currency: u.currency,
        logoUrl: u.logoUrl,
        descriptionEn: u.descriptionEn ?? '',
        descriptionAr: u.descriptionAr ?? '',
        programs: u.programs.map(p => ({
          id: p.id,
          name: p.name,
          degreeLevel: p.degreeLevel,
          field: p.field,
          durationMonths: p.durationMonths,
          language: p.language,
          tuitionUsd: p.tuitionUsd,
          deadline: p.deadline,
          entryReqs: p.entryReqs,
        })),
        scholarships: u.scholarships.map(s => ({
          id: s.id,
          name: s.name,
          amountUsd: s.amountUsd,
          amountType: s.amountType,
          eligibility: s.eligibility,
          deadline: s.deadline,
        })),
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
        avgRating,
        reviewCount: reviews.length,
        cheapestProgramTuition: cheapestProgram?.tuitionUsd ?? u.tuitionUsd,
      }
    })
  } catch (dbError) {
    // DB unavailable (Vercel without Postgres, connection failure, etc.)
    // Fall back to static JSON bundled into the build.
    console.warn('[page] DB unavailable, using static fallback data:', dbError)
    universitiesWithStats = staticUniversities as UniversityWithStats[]
  }

  // Compute aggregate stats for hero
  const totalUniversities = universitiesWithStats.length
  const totalCountries = new Set(universitiesWithStats.map(u => u.country)).size
  const totalPrograms = universitiesWithStats.reduce((sum, u) => sum + u.programs.length, 0)
  const cheapestTuition = Math.min(...universitiesWithStats.map(u => u.cheapestProgramTuition))

  // Group by country for the country explorer
  const byCountry = COUNTRIES.map(country => {
    const unis = universitiesWithStats.filter(u => u.country === country.code)
    if (unis.length === 0) return null
    const avgTuition = Math.round(unis.reduce((sum, u) => sum + u.cheapestProgramTuition, 0) / unis.length)
    return {
      ...country,
      count: unis.length,
      avgTuition,
    }
  }).filter(Boolean)

  return (
    <EduPathApp
      universities={universitiesWithStats}
      countries={byCountry as Array<NonNullable<typeof byCountry[number]>>}
      stats={{
        totalUniversities,
        totalCountries,
        totalPrograms,
        cheapestTuition,
      }}
    />
  )
}
