/**
 * Essay Review page.
 * Phase 2 feature: AI-powered essay review with rubric scoring.
 */
import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import { EssayReviewClient } from '@/components/edupath/essay-review-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Essay Review - EduPath',
  description: 'Get instant AI-powered feedback on your university application essay. 4-dimension rubric scoring with line-level suggestions.',
}

export const dynamic = 'force-dynamic'

export default async function EssayReviewPage() {
  // Fetch university names for the target university dropdown
  let universities: Array<{ id: string; name: string; country: string }> = []
  try {
    const unis = await db.university.findMany({
      select: { id: true, name: true, country: true },
      orderBy: { name: 'asc' },
    })
    universities = unis
  } catch {
    // DB unavailable — use static data
    universities = (staticUniversities as Array<{ id: string; name: string; country: string; slug: string }>)
      .map(u => ({ id: u.id, name: u.name, country: u.country }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  return <EssayReviewClient universities={universities} />
}
