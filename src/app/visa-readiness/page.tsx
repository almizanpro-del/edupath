/**
 * /visa-readiness
 *
 * Interactive visa readiness checklist. Students tick off documents
 * as they collect them and see their readiness score update in real time.
 *
 * IMPORTANT DISCLAIMER: This is NOT a visa approval predictor. It's a
 * checklist completeness tool. The score reflects how many required
 * documents the student has prepared, not their likelihood of approval.
 * (PRD AI-08 / 9.3 #4)
 */
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VisaReadinessClient } from './visa-readiness-client'

export const metadata: Metadata = {
  title: 'Visa Readiness Score — Check Your Document Checklist',
  description: 'Track your visa application documents and see your readiness score. Not a guarantee — a checklist tool.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/visa-readiness' },
}

export const dynamic = 'force-dynamic'

export default async function VisaReadinessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Allow anonymous access — but if signed in, we could pre-fill from saved data.
  // For now, just render the client component.

  return <VisaReadinessClient userId={user?.id ?? null} />
}
