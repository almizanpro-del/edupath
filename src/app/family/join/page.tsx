/**
 * /family/join?token=...
 *
 * Landing page for parents who clicked the invitation link in the email.
 * Flow:
 *   1. If not authenticated → prompt to sign up/sign in (the parent needs
 *      an EduPath account so we can link them to the student)
 *   2. If authenticated but token not yet accepted → show "Accept invitation"
 *      button that calls POST /api/family/accept
 *   3. If already accepted → redirect to /family/view/[invitationId]
 *   4. If token is invalid/revoked → show error
 */
import { Metadata } from 'next'
import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { FamilyJoinClient } from './family-join-client'

export const metadata: Metadata = {
  title: 'Join Family Room — EduPath',
  description: 'Accept your invitation to follow your student\'s university journey.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ token?: string }> }

export default async function FamilyJoinPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    notFound()
  }

  // Look up the invitation to show context (student name, what they'll see)
  let invitation: {
    id: string
    status: string
    parentName: string | null
    canSeeCosts: boolean
    canSeeDeadlines: boolean
    canSeeSafety: boolean
    canSeeAcademic: boolean
    canSeeDocuments: boolean
    student: { name: string }
  } | null = null

  try {
    invitation = await db.parentInvitation.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        status: true,
        parentName: true,
        canSeeCosts: true,
        canSeeDeadlines: true,
        canSeeSafety: true,
        canSeeAcademic: true,
        canSeeDocuments: true,
        student: { select: { name: true } },
      },
    })
  } catch {
    // DB unavailable
  }

  if (!invitation) {
    notFound()
  }

  if (invitation.status === 'revoked') {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Invitation revoked</h1>
        <p className="text-sm text-muted-foreground">
          This invitation has been revoked by the student. Please contact them directly.
        </p>
      </div>
    )
  }

  return <FamilyJoinClient invitation={invitation!} token={token!} />
}
