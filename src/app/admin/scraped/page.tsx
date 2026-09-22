import { AdminScrapedClient } from '@/components/edupath/admin-scraped-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return {
    title: t('adminScrapedTitle'),
    description: t('adminScrapedDesc'),
  }
}

export const dynamic = 'force-dynamic'

export default function AdminScrapedPage() {
  return <AdminScrapedClient />
}
