/**
 * Import scraped universities into the EduPath database.
 * Reads scripts/scraper/output/scraped-universities.json
 *
 * Usage: bun run scripts/scraper/import-scraped.ts
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'

const db = new PrismaClient()

async function main() {
  const inputFile = 'scripts/scraper/output/scraped-universities.json'
  if (!existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`)
    console.error('Run the scraper first: python3 scripts/scraper/scraper.py')
    process.exit(1)
  }

  const scraped = JSON.parse(readFileSync(inputFile, 'utf-8'))
  console.log(`Importing ${scraped.length} scraped universities...`)

  let added = 0
  let skipped = 0

  for (const uni of scraped) {
    // Check if already exists (by slug)
    const existing = await db.university.findUnique({ where: { slug: uni.slug } })
    if (existing) {
      skipped++
      continue
    }

    await db.university.create({
      data: {
        slug: uni.slug,
        name: uni.name,
        country: uni.country,
        city: uni.city,
        website: uni.website || `https://www.google.com/search?q=${encodeURIComponent(uni.name)}`,
        tuitionUsd: uni.tuitionUsd || 5000, // default estimate
        livingCostUsd: uni.livingCostUsd || 6000,
        intlStudentPct: uni.intlStudentPct || 15,
        acceptanceRate: uni.acceptanceRate ?? null,
        currency: uni.currency || 'USD',
        logoUrl: uni.logoUrl || null,
        descriptionEn: uni.descriptionEn || `${uni.name} is a university in ${uni.city}, ${uni.country}.`,
        descriptionAr: uni.descriptionAr || '',
      },
    })
    added++
  }

  const total = await db.university.count()
  console.log(`\n✓ Added ${added} new universities, skipped ${skipped} (already existed)`)
  console.log(`  Total in database: ${total}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
