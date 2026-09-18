import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import { TransferFinderClient } from '@/components/edupath/transfer-finder-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Transfer Pathway Finder - EduPath',
  description: 'Find credit transfer agreements between universities. Save thousands by starting at an affordable university and transferring to complete your degree.',
}

export const dynamic = 'force-dynamic'

export default async function TransferFinderPage() {
  let universities: Array<{ id: string; name: string; country: string; city: string }> = []
  try {
    universities = await db.university.findMany({
      select: { id: true, name: true, country: true, city: true },
      orderBy: { name: 'asc' },
    })
  } catch {
    universities = (staticUniversities as Array<{ id: string; name: string; country: string; city: string; slug: string }>)
      .map(u => ({ id: u.id, name: u.name, country: u.country, city: u.city }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  return <TransferFinderClient universities={universities} />
}
