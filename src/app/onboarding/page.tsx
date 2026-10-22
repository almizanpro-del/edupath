/**
 * /onboarding
 *
 * 4-step onboarding flow shown after first signup. Collects:
 *   1. Nationality (where are you from?)
 *   2. Education level + field of interest
 *   3. Preferred destination countries (multi-select)
 *   4. Annual budget
 *
 * On completion, saves to the User profile and redirects to home (which
 * is now personalized based on these answers).
 *
 * Auth-gated: redirects to home if no session. If the user already has
 * educationLevel set (i.e., they've onboarded before), redirect to home.
 */
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { OnboardingClient } from './onboarding-client'

export const metadata: Metadata = {
  title: "Welcome to EduPath — Let's get you started",
  description: 'Tell us about yourself so we can personalize your university search.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Check if the user has already onboarded (educationLevel is set).
  // If so, skip onboarding and send them home.
  try {
    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, name: true, educationLevel: true },
    })
    if (profile?.educationLevel) {
      redirect('/')
    }
    return <OnboardingClient
      profileId={profile?.id ?? null}
      initialName={profile?.name ?? user.email?.split('@')[0] ?? 'Student'}
    />
  } catch {
    // DB unavailable — still show onboarding (won't persist, but UX is preserved).
    return <OnboardingClient
      profileId={null}
      initialName={user.email?.split('@')[0] ?? 'Student'}
    />
  }
}
