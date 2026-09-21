import { AdminCMSClient } from '@/components/edupath/admin-cms-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return {
    title: t('adminTitle'),
    description: t('adminDesc'),
  }
}

export const dynamic = 'force-dynamic'

export default function AdminCMSPage() {
  return <AdminCMSClient />
}
