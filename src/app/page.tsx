/**
 * EduPath - University discovery and comparison for MENA students.
 * Single-page app: hero + filters + directory + detail modal + comparison.
 */
import { db } from '@/lib/db'
import { COUNTRIES, FIELDS_OF_STUDY, formatUsdCompact, countryFlag } from '@/lib/edupath'
import { EduPathApp } from '@/components/edupath/edupath-app'
import { parseTags } from '@/lib/edupath'

export const dynamic = 'force-static'
export const revalidate = 3600 // refresh hourly

export default async function Home() {
  // Fetch all universities with related data (small dataset for demo)
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

  // Compute aggregate metrics per university for display
  const universitiesWithStats = universities.map(u => {
    const reviews = u.reviews
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.ratingOverall, 0) / reviews.length
      : null

    // Best (cheapest) program
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

  // Compute aggregate stats for hero
  const totalUniversities = universitiesWithStats.length
  const totalCountries = new Set(universities.map(u => u.country)).size
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
