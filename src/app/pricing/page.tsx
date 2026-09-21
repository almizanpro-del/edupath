import { PricingClient } from '@/components/edupath/pricing-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return {
    title: t('pricingTitle'),
    description: t('pricingDesc'),
  }
}

export const dynamic = 'force-dynamic'

export default function PricingPage() {
  return <PricingClient />
}
