import { AdminAnalyticsClient } from '@/components/edupath/admin-analytics-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Analytics - EduPath' }
export const dynamic = 'force-dynamic'

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />
}
