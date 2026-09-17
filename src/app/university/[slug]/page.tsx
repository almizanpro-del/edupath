/**
 * University detail page.
 * Full-page view replacing the old modal. Fetches by slug, renders all tabs.
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { parseTags } from '@/lib/edupath'
import { UniversityDetailPage } from '@/components/edupath/university-detail-page'
import staticUniversities from '@/data/static-universities.json'
import type { Metadata } from 'next'

// Pre-generate the most popular university pages at build time
export async function generateStaticParams() {
  return staticUniversities.map((u: { slug: string }) => ({ slug: u.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const uni = (staticUniversities as Array<{ slug: string; name: string; descriptionEn: string; country: string }>).find(u => u.slug === slug)
  if (!uni) return { title: 'University not found - EduPath' }
  return {
    title: `${uni.name} - Tuition, Programs, Reviews | EduPath`,
    description: uni.descriptionEn.slice(0, 160),
    openGraph: {
      title: `${uni.name} | EduPath`,
      description: uni.descriptionEn.slice(0, 160),
      type: 'website',
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let university
  try {
    const u = await db.university.findUnique({
      where: { slug },
      include: {
        programs: true,
        scholarships: true,
        reviews: {
          where: { moderationStatus: 'approved' },
          include: { user: true },
        },
      },
    })
    if (u) {
      const reviews = u.reviews
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.ratingOverall, 0) / reviews.length
        : null
      const cheapestProgram = u.programs.length > 0
        ? u.programs.reduce((min, p) => p.tuitionUsd < min.tuitionUsd ? p : min, u.programs[0])
        : null
      university = {
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
          id: p.id, name: p.name, degreeLevel: p.degreeLevel, field: p.field,
          durationMonths: p.durationMonths, language: p.language, tuitionUsd: p.tuitionUsd,
          deadline: p.deadline, entryReqs: p.entryReqs,
        })),
        scholarships: u.scholarships.map(s => ({
          id: s.id, name: s.name, amountUsd: s.amountUsd, amountType: s.amountType,
          eligibility: s.eligibility, deadline: s.deadline,
        })),
        reviews: reviews.map(r => ({
          id: r.id, userName: r.user.name ?? 'Anonymous', userCountry: r.user.country,
          ratingOverall: r.ratingOverall, ratingAffordability: r.ratingAffordability,
          ratingVisa: r.ratingVisa, ratingTeaching: r.ratingTeaching,
          ratingSafety: r.ratingSafety, ratingSocial: r.ratingSocial,
          reviewText: r.reviewText, helpfulCount: r.helpfulCount,
          verifiedEnrollment: r.verifiedEnrollment, tags: parseTags(r.tags),
          createdAt: r.createdAt.toISOString(),
        })),
        avgRating, reviewCount: reviews.length,
        cheapestProgramTuition: cheapestProgram?.tuitionUsd ?? u.tuitionUsd,
      }
    }
  } catch (dbError) {
    console.warn('[university page] DB unavailable, using static fallback:', dbError)
  }

  // Fallback to static data
  if (!university) {
    university = (staticUniversities as Array<typeof university>).find(u => u?.slug === slug)
  }

  if (!university) {
    notFound()
  }

  return <UniversityDetailPage uni={university} />
}
