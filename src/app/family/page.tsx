/**
 * /family
 *
 * Family Decision Room — the PRD's #1 unique product bet.
 *
 * Students use this page to:
 *   - Invite a parent/guardian by email
 *   - Manage permission controls (what the parent can see)
 *   - Revoke invitations
 *
 * Parents who have accepted see a simplified dashboard focused on
 * costs, deadlines, and safety — not academic details.
 */
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { FamilyClient } from './family-client'

export const metadata: Metadata = {
  title: 'Family Decision Room',
  description: 'Invite your parents to follow your university journey with controlled permissions.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function FamilyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  let sent: Array<{
    id: string; parentEmail: string; parentName: string | null
    status: string; inviteToken: string; createdAt: string; acceptedAt: string | null
    canSeeCosts: boolean; canSeeDeadlines: boolean; canSeeSafety: boolean
    canSeeAcademic: boolean; canSeeDocuments: boolean
  }> = []
  let received: Array<{
    id: string
    student: { id: string; name: string; country: string; fieldOfInterest: string | null }
    permissions: {
      canSeeCosts: boolean; canSeeDeadlines: boolean; canSeeSafety: boolean
      canSeeAcademic: boolean; canSeeDocuments: boolean
    }
  }> = []

  try {
    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    })
    if (!profile) redirect('/')

    const [sentInv, receivedInv] = await Promise.all([
      db.parentInvitation.findMany({
        where: { studentId: profile.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, parentEmail: true, parentName: true, status: true,
          inviteToken: true, createdAt: true, acceptedAt: true,
          canSeeCosts: true, canSeeDeadlines: true, canSeeSafety: true,
          canSeeAcademic: true, canSeeDocuments: true,
        },
      }),
      db.parentInvitation.findMany({
        where: { parentId: profile.id, status: 'accepted' },
        include: {
          student: { select: { id: true, name: true, country: true, fieldOfInterest: true } },
        },
      }),
    ])

    sent = sentInv.map(i => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      acceptedAt: i.acceptedAt?.toISOString() ?? null,
    }))
    received = receivedInv.map(i => ({
      id: i.id,
      student: i.student,
      permissions: {
        canSeeCosts: i.canSeeCosts,
        canSeeDeadlines: i.canSeeDeadlines,
        canSeeSafety: i.canSeeSafety,
        canSeeAcademic: i.canSeeAcademic,
        canSeeDocuments: i.canSeeDocuments,
      },
    }))
  } catch (err) {
    console.warn('[family] DB unavailable:', err)
  }

  return <FamilyClient sent={sent} received={received} />
}
