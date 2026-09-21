import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import { ClaimClient } from '@/components/edupath/claim-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return {
    title: t('claimTitle'),
    description: t('claimDesc'),
  }
}

export const dynamic = 'force-dynamic'

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let university: { id: string; name: string; slug: string; country: string; city: string } | null = null

  try {
    const u = await db.university.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, country: true, city: true } })
    if (u) university = u
  } catch {
    // DB unavailable — use static data
  }

  if (!university) {
    university = (staticUniversities as Array<{ id: string; name: string; slug: string; country: string; city: string }>).find(u => u.slug === slug) ?? null
  }

  if (!university) return <div className="min-h-screen flex items-center justify-center"><p>University not found</p></div>

  return <ClaimClient university={university} />
}
