/**
 * Dynamic sitemap.xml
 * Generates URLs for: home, pricing, essay-review, transfer-finder, scholarships,
 * and all 107 university detail pages.
 */
import { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'

const BASE_URL = 'https://edupath-amber-three.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/essay-review`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/transfer-finder`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/scholarships`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  // Get all university slugs
  let universitySlugs: string[] = []
  try {
    const unis = await db.university.findMany({
      where: { pendingReview: false },
      select: { slug: true, updatedAt: true },
    })
    universitySlugs = unis.map(u => u.slug)
  } catch {
    universitySlugs = (staticUniversities as Array<{ slug: string }>).map(u => u.slug)
  }

  const universityPages: MetadataRoute.Sitemap = universitySlugs.map(slug => ({
    url: `${BASE_URL}/university/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  return [...staticPages, ...universityPages]
}
