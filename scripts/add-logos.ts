/**
 * Add logo URLs to universities that don't have them.
 * Uses the university's website favicon as a fallback logo.
 * Run: bun run scripts/add-logos.ts
 */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const universities = await db.university.findMany({
    where: { logoUrl: null },
    select: { id: true, name: true, website: true },
  })

  console.log(`Adding logos to ${universities.length} universities...`)

  let updated = 0
  for (const uni of universities) {
    // Generate a logo URL from the university's website domain using Google's favicon service
    let domain = ''
    try {
      if (uni.website) {
        const url = new URL(uni.website)
        domain = url.hostname
      }
    } catch {
      // Invalid URL — skip
    }

    if (domain) {
      // Use Google's favicon service as a reliable logo source
      const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
      await db.university.update({
        where: { id: uni.id },
        data: { logoUrl },
      })
      updated++
    }
  }

  console.log(`✓ Added logos to ${updated} universities`)
  const withLogos = await db.university.count({ where: { logoUrl: { not: null } } })
  console.log(`  Total with logos: ${withLogos}`)
}

main().catch(console.error).finally(() => db.$disconnect())
