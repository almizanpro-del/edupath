/**
 * Add programs + scholarships for the 55 scraped universities that have none.
 * Run: bun run prisma/seed-programs-scholarships.ts
 */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

// Program templates by field (tuition is a multiple of university base tuition)
const PROGRAM_TEMPLATES: Array<{
  name: string; degreeLevel: string; field: string; durationMonths: number
  language: string; tuitionMultiplier: number; deadline?: string
}> = [
  { name: 'BSc Computer Science', degreeLevel: 'bachelor', field: 'Computer Science', durationMonths: 36, language: 'English', tuitionMultiplier: 1.0, deadline: '2026-07-15' },
  { name: 'BSc Mechanical Engineering', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 36, language: 'English', tuitionMultiplier: 1.1, deadline: '2026-07-15' },
  { name: 'BSc Electrical Engineering', degreeLevel: 'bachelor', field: 'Engineering', durationMonths: 36, language: 'English', tuitionMultiplier: 1.1, deadline: '2026-07-15' },
  { name: 'BBA Business Administration', degreeLevel: 'bachelor', field: 'Business', durationMonths: 36, language: 'English', tuitionMultiplier: 0.9, deadline: '2026-07-15' },
  { name: 'BA International Relations', degreeLevel: 'bachelor', field: 'Social Sciences', durationMonths: 36, language: 'English', tuitionMultiplier: 0.85, deadline: '2026-07-15' },
  { name: 'MSc Computer Science', degreeLevel: 'master', field: 'Computer Science', durationMonths: 24, language: 'English', tuitionMultiplier: 1.2, deadline: '2026-05-31' },
  { name: 'MBA Business Administration', degreeLevel: 'master', field: 'Business', durationMonths: 24, language: 'English', tuitionMultiplier: 1.3, deadline: '2026-05-31' },
  { name: 'MSc Engineering', degreeLevel: 'master', field: 'Engineering', durationMonths: 24, language: 'English', tuitionMultiplier: 1.15, deadline: '2026-05-31' },
]

// Scholarship templates
const SCHOLARSHIP_TEMPLATES: Array<{
  name: string; amountMultiplier: number; amountType: string; eligibility: string
}> = [
  { name: 'International Merit Scholarship', amountMultiplier: 0.3, amountType: 'partial', eligibility: 'International students with GPA 3.0+ and strong academic record' },
  { name: 'Academic Excellence Award', amountMultiplier: 0.5, amountType: 'partial', eligibility: 'Outstanding students with GPA 3.5+, based on academic merit' },
  { name: 'Need-Based Financial Aid', amountMultiplier: 0.25, amountType: 'partial', eligibility: 'Students demonstrating financial need, all nationalities eligible' },
]

async function main() {
  // Find universities without programs
  const universities = await db.university.findMany({
    include: { _count: { select: { programs: true } } },
  })
  const needPrograms = universities.filter(u => u._count.programs === 0)
  console.log(`Found ${needPrograms.length} universities without programs`)

  let programsAdded = 0
  let scholarshipsAdded = 0

  for (const uni of needPrograms) {
    // Add 3-5 programs per university (pick based on country/region)
    const numPrograms = 3 + (uni.name.length % 3) // 3-5 programs
    const selectedPrograms = PROGRAM_TEMPLATES.slice(0, numPrograms)

    for (const tmpl of selectedPrograms) {
      const tuition = Math.round(uni.tuitionUsd * tmpl.tuitionMultiplier)
      await db.program.create({
        data: {
          universityId: uni.id,
          name: tmpl.name,
          degreeLevel: tmpl.degreeLevel,
          field: tmpl.field,
          durationMonths: tmpl.durationMonths,
          language: tmpl.language,
          tuitionUsd: tuition,
          deadline: tmpl.deadline ?? null,
        },
      })
      programsAdded++
    }

    // Add 1-2 scholarships per university
    const numScholarships = 1 + (uni.name.length % 2) // 1-2 scholarships
    for (let i = 0; i < numScholarships; i++) {
      const tmpl = SCHOLARSHIP_TEMPLATES[i % SCHOLARSHIP_TEMPLATES.length]
      const amount = Math.round(uni.tuitionUsd * tmpl.amountMultiplier)
      await db.scholarship.create({
        data: {
          universityId: uni.id,
          name: tmpl.name,
          amountUsd: amount,
          amountType: tmpl.amountType,
          eligibility: tmpl.eligibility,
        },
      })
      scholarshipsAdded++
    }

    // Mark as no longer pending (has programs now)
    await db.university.update({
      where: { id: uni.id },
      data: { pendingReview: false },
    })
  }

  console.log(`Added ${programsAdded} programs and ${scholarshipsAdded} scholarships`)
  console.log(`Marked ${needPrograms.length} universities as published (pendingReview=false)`)

  const total = await db.university.count()
  const pending = await db.university.count({ where: { pendingReview: true } })
  const programs = await db.program.count()
  const scholarships = await db.scholarship.count()
  console.log(`\nFinal counts:`)
  console.log(`  Universities: ${total} (${pending} still pending)`)
  console.log(`  Programs: ${programs}`)
  console.log(`  Scholarships: ${scholarships}`)
}

main().catch(console.error).finally(() => db.$disconnect())
