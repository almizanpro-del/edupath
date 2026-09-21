import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import { ScholarshipMatcherClient } from '@/components/edupath/scholarship-matcher-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return {
    title: t('scholarshipsTitle'),
    description: t('scholarshipsDesc'),
  }
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
