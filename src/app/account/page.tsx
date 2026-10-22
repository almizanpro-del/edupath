/**
 * /account
 *
 * Account settings page. Currently:
 *   - Shows profile info (read-only for now; editing comes in Phase 2)
 *   - Account deletion flow (GDPR Article 17 right to erasure)
 *
 * Auth-gated: redirects to home if no session.
 */
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AccountSettingsClient } from './account-settings-client'

export const metadata: Metadata = {
  title: 'Account Settings',
  description: 'Manage your EduPath account.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Load profile + stats (review count, saved-list count) so the delete
  // confirmation can show the user exactly what they're losing.
  let profile: {
    id: string
    name: string
    email: string
    country: string
    fieldOfInterest: string | null
    role: string
    verificationStatus: string
    createdAt: Date
  } | null = null
  let stats = { reviews: 0, savedLists: 0, intakeSessions: 0, leads: 0 }

  try {
    profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        fieldOfInterest: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
      },
    })

    if (profile) {
      const [reviews, savedLists, intakeSessions, leads] = await Promise.all([
        db.review.count({ where: { userId: profile.id } }),
        db.savedList.count({ where: { userId: profile.id } }),
        db.intakeSession.count({ where: { userId: profile.id } }),
        db.lead.count({ where: { studentEmail: user.email ?? '' } }),
      ])
      stats = { reviews, savedLists, intakeSessions, leads }
    }
  } catch (err) {
    console.warn('[account] DB unavailable, showing minimal page:', err)
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <AccountSettingsClient
        profile={
          profile
            ? {
                name: profile.name,
                email: profile.email,
                country: profile.country,
                fieldOfInterest: profile.fieldOfInterest,
                role: profile.role,
                verificationStatus: profile.verificationStatus,
                createdAt: profile.createdAt.toISOString(),
              }
            : {
                name: user.email?.split('@')[0] ?? 'Student',
                email: user.email ?? '',
                country: 'Jordan',
                fieldOfInterest: null,
                role: 'student',
                verificationStatus: 'pending',
                createdAt: new Date().toISOString(),
              }
        }
        stats={stats}
        dbAvailable={!!profile}
      />
    </div>
  )
}
