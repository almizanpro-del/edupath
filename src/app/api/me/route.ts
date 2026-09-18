/**
 * GET /api/me
 * Returns the current user's profile (Prisma User record mapped from Supabase auth).
 * Returns { user: null, profile: null } if not signed in or DB unavailable.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ user: null, profile: null }, { status: 200 })
    }

    // Find or create matching Prisma User record
    let profile
    try {
      profile = await db.user.findUnique({
        where: { supabaseId: user.id },
      })

      if (!profile) {
        // First-time login: create profile from Supabase user metadata
        profile = await db.user.create({
          data: {
            supabaseId: user.id,
            email: user.email ?? '',
            name:
              (user.user_metadata?.full_name as string) ??
              (user.email?.split('@')[0] ?? 'Student'),
            country: (user.user_metadata?.country as string) ?? 'Jordan',
            fieldOfInterest: (user.user_metadata?.field_of_interest as string) ?? null,
            verificationStatus: 'pending',
          },
        })
      }
    } catch (dbError) {
      // DB unavailable (Vercel without Postgres) — return a minimal profile
      // from Supabase user metadata so the UI still works in read-only mode.
      console.warn('[api/me] DB unavailable, returning minimal profile:', dbError)
      return NextResponse.json({
        user: { id: user.id, email: user.email },
        profile: {
          id: user.id,
          name: (user.user_metadata?.full_name as string) ?? (user.email?.split('@')[0] ?? 'Student'),
          country: (user.user_metadata?.country as string) ?? 'Jordan',
          fieldOfInterest: null,
          verificationStatus: 'pending',
          role: 'student',
        },
        dbAvailable: false,
      })
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile: {
        id: profile.id,
        name: profile.name,
        country: profile.country,
        fieldOfInterest: profile.fieldOfInterest,
        verificationStatus: profile.verificationStatus,
        role: profile.role,
      },
      dbAvailable: true,
    })
  } catch (error) {
    // Supabase itself failed — return unauthenticated
    console.warn('[api/me] Error:', error)
    return NextResponse.json({ user: null, profile: null }, { status: 200 })
  }
}
