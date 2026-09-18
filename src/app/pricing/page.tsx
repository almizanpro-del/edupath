import { PricingClient } from '@/components/edupath/pricing-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing - EduPath',
  description: 'Choose your plan. Free for students, premium features for serious applicants, sponsorships for universities.',
}

export const dynamic = 'force-dynamic'

export default function PricingPage() {
  return <PricingClient />
}
