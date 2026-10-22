/**
 * /my-applications
 *
 * Kanban-style application tracker. Students can:
 *   - Add a university to track
 *   - Move it through pipeline stages (researching → applying → submitted →
 *     interviewing → decision → enrolled)
 *   - Set deadlines, applied date, decision date
 *   - Add notes
 *   - See decision outcome (accepted/rejected/waitlisted/deferred)
 *
 * This is the "sticky" feature that brings students back weekly for 6+
 * months during their application cycle.
 */
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ApplicationsClient } from './applications-client'

export const metadata: Metadata = {
  title: 'My Applications',
  description: 'Track your university applications from research to enrollment.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function MyApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  let applications: Array<{
    id: string
    status: string
    decision: string | null
    programId: string | null
    appliedAt: string | null
    deadlineAt: string | null
    decisionAt: string | null
    notes: string
    createdAt: string
    updatedAt: string
    university: { id: string; name: string; slug: string; country: string; city: string }
  }> = []

  try {
    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    })

    if (profile) {
      const apps = await db.applicationTracker.findMany({
        where: { userId: profile.id },
        include: {
          university: { select: { id: true, name: true, slug: true, country: true, city: true } },
        },
        orderBy: { updatedAt: 'desc' },
      })

      applications = apps.map(a => ({
        id: a.id,
        status: a.status,
        decision: a.decision,
        programId: a.programId,
        appliedAt: a.appliedAt?.toISOString() ?? null,
        deadlineAt: a.deadlineAt?.toISOString() ?? null,
        decisionAt: a.decisionAt?.toISOString() ?? null,
        notes: a.notes,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        university: a.university,
      }))
    }
  } catch (err) {
    console.warn('[my-applications] DB unavailable:', err)
  }

  return <ApplicationsClient applications={applications} />
}
