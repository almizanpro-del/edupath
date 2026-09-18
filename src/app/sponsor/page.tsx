import { SponsorDashboardClient } from '@/components/edupath/sponsor-dashboard-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sponsor Dashboard - EduPath',
  description: 'University sponsor analytics: profile views, leads, review sentiment, and comparison appearances.',
}

export const dynamic = 'force-dynamic'

export default function SponsorPage() {
  return <SponsorDashboardClient />
}
