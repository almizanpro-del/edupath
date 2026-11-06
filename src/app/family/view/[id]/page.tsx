/**
 * /family/view/[id]
 *
 * Parent's simplified dashboard. Shows the student's university journey
 * with controlled visibility based on the ParentInvitation permissions:
 *   - Costs (if canSeeCosts)
 *   - Deadlines (if canSeeDeadlines)
 *   - Safety info (if canSeeSafety)
 *   - Academic details (if canSeeAcademic)
 *   - Documents (if canSeeDocuments)
 *
 * Auth-gated: parent must be authenticated and linked to this invitation.
 */
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { FamilyViewClient } from './family-view-client'

export const metadata: Metadata = {
  title: 'Family Dashboard — EduPath',
  description: 'Follow your student\'s university journey.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function FamilyViewPage({ params }: Props) {
  const { id: invitationId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  try {
    // Load the parent's profile
    const parentProfile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    })
    if (!parentProfile) redirect('/')

    // Load the invitation — must be accepted AND linked to this parent
    const invitation = await db.parentInvitation.findUnique({
      where: { id: invitationId },
      include: {
        student: {
          select: {
            id: true, name: true, country: true, fieldOfInterest: true,
            educationLevel: true, preferredCountries: true, budgetUsd: true,
            gpa: true, englishLevel: true, intake: true,
          },
        },
      },
    })

    if (!invitation) notFound()
    if (invitation.status !== 'accepted') notFound()
    if (invitation.parentId !== parentProfile.id) {
      // Not authorized — this parent isn't linked to this invitation
      notFound()
    }

    // Load the student's saved universities and applications
    const [savedList, applications] = await Promise.all([
      db.savedList.findFirst({
        where: { userId: invitation.studentId },
      }),
      db.applicationTracker.findMany({
        where: { userId: invitation.studentId },
        include: {
          university: { select: { id: true, name: true, slug: true, country: true, city: true, tuitionUsd: true, livingCostUsd: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    // Parse saved university IDs
    let savedUniversityIds: string[] = []
    if (savedList) {
      try {
        savedUniversityIds = JSON.parse(savedList.universities)
      } catch {
        // ignore parse error
      }
    }

    // Load the actual university data for saved list
    let savedUniversities: Array<{
      id: string; name: string; slug: string; country: string; city: string
      tuitionUsd: number; livingCostUsd: number
    }> = []
    if (savedUniversityIds.length > 0) {
      savedUniversities = await db.university.findMany({
        where: { id: { in: savedUniversityIds }, pendingReview: false },
        select: {
          id: true, name: true, slug: true, country: true, city: true,
          tuitionUsd: true, livingCostUsd: true,
        },
      })
    }

    return (
      <FamilyViewClient
        invitation={{
          canSeeCosts: invitation.canSeeCosts,
          canSeeDeadlines: invitation.canSeeDeadlines,
          canSeeSafety: invitation.canSeeSafety,
          canSeeAcademic: invitation.canSeeAcademic,
          canSeeDocuments: invitation.canSeeDocuments,
        }}
        student={{
          name: invitation.student.name,
          country: invitation.student.country,
          fieldOfInterest: invitation.student.fieldOfInterest,
          educationLevel: invitation.student.educationLevel,
          preferredCountries: invitation.student.preferredCountries
            ? JSON.parse(invitation.student.preferredCountries)
            : [],
          budgetUsd: invitation.student.budgetUsd,
          gpa: invitation.student.gpa,
          englishLevel: invitation.student.englishLevel,
          intake: invitation.student.intake,
        }}
        savedUniversities={savedUniversities}
        applications={applications.map(a => ({
          id: a.id,
          status: a.status,
          decision: a.decision,
          deadlineAt: a.deadlineAt?.toISOString() ?? null,
          notes: a.notes,
          updatedAt: a.updatedAt.toISOString(),
          university: a.university,
        }))}
      />
    )
  } catch (err) {
    console.error('[family/view] Error:', err)
    notFound()
  }
}
