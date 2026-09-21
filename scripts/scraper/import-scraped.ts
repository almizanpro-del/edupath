/**
 * Import scraped universities into the ScrapedUniversity staging table.
 *
 * Reads: scripts/scraper/output/scraped-universities.json
 * Writes: ScrapedUniversity table (awaiting admin review)
 *
 * Admins can then review and approve scraped records via /admin/scraped.
 * Approved records are promoted to the University table.
 *
 * Usage: bun run scripts/scraper/import-scraped.ts
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'

const db = new PrismaClient()

// Simple name normalization (mirrors scraper/normalize.py)
function normalizeName(name: string): string {
  if (!name) return ''
  const stopWords = new Set(['the', 'of', 'and', 'at', 'in', 'on', 'for'])
  const suffixes = ['university', 'college', 'institute', 'school', 'academy', 'polytechnic']
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => !stopWords.has(w))
    .join(' ')
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      return normalized.slice(0, -suffix.length).trim()
    }
  }
  return normalized
}

async function main() {
  const inputFile = 'scripts/scraper/output/scraped-universities.json'
  if (!existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`)
    console.error('Run the scraper first: python -m scraper.pipeline --source all')
    process.exit(1)
  }

  const scraped = JSON.parse(readFileSync(inputFile, 'utf-8'))
  console.log(`Importing ${scraped.length} scraped universities into staging table...`)

  let added = 0
  let skipped = 0
  let updated = 0

  for (const uni of scraped) {
    const normalizedName = normalizeName(uni.name)
    const slug = uni.slug || uni.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check if already in staging (by normalized name)
    const existing = await db.scrapedUniversity.findFirst({
      where: { normalizedName },
    })

    if (existing) {
      // Update existing record with newer data
      await db.scrapedUniversity.update({
        where: { id: existing.id },
        data: {
          slug,
          name: uni.name,
          country: uni.country,
          city: uni.city || '',
          website: uni.website || null,
          tuitionUsd: uni.tuitionUsd || 0,
          livingCostUsd: uni.livingCostUsd || 0,
          intlStudentPct: uni.intlStudentPct || 0,
          acceptanceRate: uni.acceptanceRate ?? null,
          currency: uni.currency || 'USD',
          logoUrl: uni.logoUrl || null,
          descriptionEn: uni.descriptionEn || null,
          descriptionAr: uni.descriptionAr || null,
          source: uni.source || 'unknown',
          qualityScore: uni.qualityScore || 0,
          qualityBreakdown: uni.qualityBreakdown ? JSON.stringify(uni.qualityBreakdown) : null,
          status: uni.status || 'manual_review',
          rawData: JSON.stringify(uni),
          updatedAt: new Date(),
        },
      })
      updated++
      continue
    }

    // Create new staging record
    await db.scrapedUniversity.create({
      data: {
        slug,
        name: uni.name,
        normalizedName,
        country: uni.country,
        city: uni.city || '',
        website: uni.website || null,
        tuitionUsd: uni.tuitionUsd || 0,
        livingCostUsd: uni.livingCostUsd || 0,
        intlStudentPct: uni.intlStudentPct || 0,
        acceptanceRate: uni.acceptanceRate ?? null,
        currency: uni.currency || 'USD',
        logoUrl: uni.logoUrl || null,
        descriptionEn: uni.descriptionEn || null,
        descriptionAr: uni.descriptionAr || null,
        source: uni.source || 'unknown',
        qualityScore: uni.qualityScore || 0,
        qualityBreakdown: uni.qualityBreakdown ? JSON.stringify(uni.qualityBreakdown) : null,
        status: uni.status || 'manual_review',
        rawData: JSON.stringify(uni),
      },
    })
    added++
  }

  const totalStaging = await db.scrapedUniversity.count()
  const byStatus = await db.scrapedUniversity.groupBy({
    by: ['status'],
    _count: true,
  })

  console.log(`\n✓ Added ${added} new records, updated ${updated}, skipped ${skipped}`)
  console.log(`  Total in staging table: ${totalStaging}`)
  console.log(`  By status:`)
  for (const s of byStatus) {
    console.log(`    ${s.status}: ${s._count}`)
  }
  console.log(`\nNext step: Review at /admin/scraped`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
