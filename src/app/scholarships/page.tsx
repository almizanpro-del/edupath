import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import { ScholarshipMatcherClient } from '@/components/edupath/scholarship-matcher-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Financial Aid Matcher - EduPath',
  description: 'AI-powered scholarship matching. Enter your profile and get personalized scholarship matches with match scores and application tips.',
}

export const dynamic = 'force-dynamic'

export default async function ScholarshipsPage() {
  let scholarshipCount = 0
  try {
    scholarshipCount = await db.scholarship.count()
  } catch {
    scholarshipCount = (staticUniversities as Array<{ scholarships: unknown[] }>).reduce((s, u) => s + u.scholarships.length, 0)
  }

  return <ScholarshipMatcherClient totalScholarships={scholarshipCount} />
}
