/**
 * /admin/claims
 *
 * Admin-only page for reviewing university ownership claims.
 * Shows pending claims with claimant info, official email, proof URL,
 * and approve/reject buttons.
 *
 * When approved: claimant → recruiter, university.claimedByUserId set,
 * "Verified by University" badge appears on the detail page.
 */
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AdminClaimsClient } from './admin-claims-client'

export const metadata: Metadata = {
  title: 'University Claims — Admin',
  description: 'Review and approve university ownership claims.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminClaimsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Admin check
  try {
    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { role: true },
    })
    if (!profile || profile.role !== 'admin') {
      redirect('/admin')
    }
  } catch {
    redirect('/admin')
  }

  // Load all claims (pending + resolved)
  let claims: Array<{
    id: string
    universityId: string | null
    universityName: string
    universitySlug: string
    universityCountry: string
    claimantName: string
    claimantEmail: string
    officialName: string
    officialEmail: string
    officialTitle: string | null
    proofUrl: string | null
    status: string
    submittedAt: string
  }> = []

  try {
    const events = await db.analyticsEvent.findMany({
      where: { eventType: 'university_claim' },
      include: { university: { select: { name: true, slug: true, country: true } } },
      orderBy: { createdAt: 'desc' },
    })

    claims = events
      .filter(e => e.university !== null)
      .map(e => {
        const meta = JSON.parse(e.metadata)
        const uni = e.university!
        return {
          id: e.id,
          universityId: e.universityId,
          universityName: uni.name,
          universitySlug: uni.slug,
          universityCountry: uni.country,
          claimantName: meta.claimantName ?? 'Unknown',
          claimantEmail: meta.claimantEmail ?? '',
          officialName: meta.officialName ?? '',
          officialEmail: meta.officialEmail ?? '',
          officialTitle: meta.officialTitle ?? null,
          proofUrl: meta.proofUrl ?? null,
          status: meta.status ?? 'pending',
          submittedAt: e.createdAt.toISOString(),
        }
      })
  } catch (err) {
    console.warn('[admin/claims] DB unavailable:', err)
  }

  return <AdminClaimsClient claims={claims} />
}
