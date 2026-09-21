import { SponsorDashboardClient } from '@/components/edupath/sponsor-dashboard-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return {
    title: t('sponsorTitle'),
    description: t('sponsorDesc'),
  }
}

export const dynamic = 'force-dynamic'

export default function SponsorPage() {
  return <SponsorDashboardClient />
}
