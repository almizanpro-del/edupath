/**
 * Shared auth helpers for API routes.
 *
 * Extracted from 5 copy-pasted requireAdmin() implementations to ensure
 * consistent admin checks across all admin routes.
 */

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

type UserProfile = {
  id: string
  role: string
  name: string
  email: string
  country: string
  fieldOfInterest: string | null
  verificationStatus: string
}

/**
 * Get the authenticated user's profile, creating it if it doesn't exist yet.
 * Returns null if not authenticated.
 */
export async function getOrCreateProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let profile = await db.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      id: true, role: true, name: true, email: true,
      country: true, fieldOfInterest: true, verificationStatus: true,
    },
  })

  if (!profile) {
    profile = await db.user.create({
      data: {
        supabaseId: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Student',
        country: user.user_metadata?.country ?? 'Jordan',
        role: 'student',
      },
      select: {
        id: true, role: true, name: true, email: true,
        country: true, fieldOfInterest: true, verificationStatus: true,
      },
    })
  }

  return profile
}

/**
 * Require admin role. Returns the profile if admin, or null if not.
 * Use in API routes:
 *   const profile = await requireAdmin()
 *   if (!profile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
 */
export async function requireAdmin(): Promise<UserProfile | null> {
  const profile = await getOrCreateProfile()
  if (!profile) return null
  return profile.role === 'admin' ? profile : null
}

/**
 * Require recruiter or admin role. Returns the profile if authorized, or null.
 */
export async function requireRecruiterOrAdmin(): Promise<UserProfile | null> {
  const profile = await getOrCreateProfile()
  if (!profile) return null
  return (profile.role === 'recruiter' || profile.role === 'admin') ? profile : null
}
