import { AdminAnalyticsClient } from '@/components/edupath/admin-analytics-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return {
    title: t('adminAnalyticsTitle'),
    description: t('adminAnalyticsDesc'),
  }
}

export const dynamic = 'force-dynamic'

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />
}
