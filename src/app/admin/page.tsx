import { AdminCMSClient } from '@/components/edupath/admin-cms-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin CMS - EduPath',
  description: 'Editorial review of scraped university data. Approve, edit, or delete universities.',
}

export const dynamic = 'force-dynamic'

export default function AdminCMSPage() {
  return <AdminCMSClient />
}
