/**
 * Generate static fallback data for transfer pathways.
 * Run: bun run scripts/generate-static-data.ts
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const db = new PrismaClient()

async function main() {
  const pathways = await db.transferPathway.findMany({
    include: {
      fromUniversity: { select: { id: true, name: true, slug: true, country: true, city: true, tuitionUsd: true, livingCostUsd: true } },
      toUniversity: { select: { id: true, name: true, slug: true, country: true, city: true, tuitionUsd: true, livingCostUsd: true } },
    },
    orderBy: { estimatedSavingsUsd: 'desc' },
  })

  const data = pathways.map(p => ({
    id: p.id,
    creditsAccepted: p.creditsAccepted,
    totalCredits: p.totalCredits,
    agreementType: p.agreementType,
    notes: p.notes,
    requirements: p.requirements,
    estimatedSavingsUsd: p.estimatedSavingsUsd,
    fromUniversity: p.fromUniversity,
    toUniversity: p.toUniversity,
  }))

  writeFileSync('src/data/static-pathways.json', JSON.stringify(data, null, 2))
  console.log(`✓ ${data.length} transfer pathways written to src/data/static-pathways.json`)
}

main().catch(console.error).finally(() => db.$disconnect())
