import { RihlaAgentClient } from '@/components/edupath/rihla-agent-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return {
    title: t('agentTitle'),
    description: t('agentDesc'),
  }
}

export const dynamic = 'force-dynamic'

export default function AgentPage() {
  return <RihlaAgentClient />
}
