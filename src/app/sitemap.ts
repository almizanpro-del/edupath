/**
 * Dynamic sitemap.xml
 * Generates URLs for: home, pricing, essay-review, transfer-finder, scholarships,
 * and all university detail pages.
 * Includes both /en and /ar locale variants for SEO.
 */
import { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'

const BASE_URL = 'https://edupath.cafepass.net'

const STATIC_PAGES = [
  { path: '', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/compare', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/essay-review', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/transfer-finder', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/scholarships', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/agent', priority: 0.8, changeFrequency: 'monthly' as const },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // Static pages (single URL — the app uses cookie-based locale, not URL-based)
  for (const page of STATIC_PAGES) {
    entries.push({
      url: `${BASE_URL}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })
  }

  // Get all university slugs (from DB, fall back to static data)
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

  // University detail pages
  for (const slug of universitySlugs) {
    entries.push({
      url: `${BASE_URL}/university/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })
  }

  // Country landing pages (Phase 4 — programmatic SEO)
  const countries = [...new Set(
    (staticUniversities as Array<{ country: string }>).map(u => u.country)
  )]
  for (const country of countries) {
    const code = country.toLowerCase().replace(/\s+/g, '-')
    entries.push({
      url: `${BASE_URL}/country/${code}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })
  }

  return entries
}
