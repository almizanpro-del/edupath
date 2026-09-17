/**
 * Generate static fallback data from the database.
 * Run: bun run scripts/generate-static-data.ts
 *
 * This creates src/data/static-universities.json which the page uses as a
 * fallback when the database is unavailable (e.g., on Vercel where SQLite
 * doesn't work). The JSON is bundled into the build.
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const db = new PrismaClient()

async function main() {
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

  const data = universities.map(u => ({
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
    reviews: u.reviews.map(r => ({
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
      tags: JSON.parse(r.tags || '[]'),
      createdAt: r.createdAt.toISOString(),
    })),
  }))

  // Compute aggregate fields
  const withStats = data.map(u => {
    const reviews = u.reviews
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.ratingOverall, 0) / reviews.length
      : null
    const cheapestProgram = u.programs.length > 0
      ? u.programs.reduce((min, p) => p.tuitionUsd < min.tuitionUsd ? p : min, u.programs[0])
      : null
    return {
      ...u,
      avgRating,
      reviewCount: reviews.length,
      cheapestProgramTuition: cheapestProgram?.tuitionUsd ?? u.tuitionUsd,
    }
  })

  const outDir = join(process.cwd(), 'src', 'data')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'static-universities.json')
  writeFileSync(outPath, JSON.stringify(withStats, null, 2))

  console.log(`✓ Static data written to ${outPath}`)
  console.log(`  ${withStats.length} universities`)
  console.log(`  ${withStats.reduce((s, u) => s + u.programs.length, 0)} programs`)
  console.log(`  ${withStats.reduce((s, u) => s + u.scholarships.length, 0)} scholarships`)
  console.log(`  ${withStats.reduce((s, u) => s + u.reviews.length, 0)} reviews`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
