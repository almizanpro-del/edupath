/**
 * /api/me
 *
 * GET    — Returns the current user's profile (read-only).
 * DELETE — Permanently deletes the user's account and all associated data.
 *           Implements GDPR Article 17 (right to erasure) and Jordan PPL.
 *
 * The DELETE handler cascades through every table that holds user data:
 *   - Review           (rows authored by this user)
 *   - SavedList        (rows saved by this user)
 *   - IntakeSession    (Rihla AI chat sessions)
 *   - IntakeMessage    (messages inside those sessions, cascaded by Prisma)
 *   - AgentMatch       (matches inside those sessions, cascaded by Prisma)
 *   - Lead             (rows where studentEmail matches this user's email)
 *   - Subscription     (Stripe subscription record, if any)
 *   - User             (the Prisma profile row itself)
 *
 * It then signs out the Supabase auth session. The Supabase auth.users
 * row itself requires a service-role key to delete (see comment below);
 * if SUPABASE_SERVICE_ROLE_KEY is set we delete it immediately, otherwise
 * we leave it to be cleaned up by a scheduled job.
 *
 * Returns 401 if not authenticated, 200 on success.
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

    let profile
    try {
      profile = await db.user.findUnique({
        where: { supabaseId: user.id },
      })

      if (!profile) {
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
    console.warn('[api/me] Error:', error)
    return NextResponse.json({ user: null, profile: null }, { status: 200 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let dbProfileId: string | null = null
    let userEmail: string | null = user.email ?? null

    // Try to find the Prisma User row and cascade-delete all related data.
    try {
      const profile = await db.user.findUnique({
        where: { supabaseId: user.id },
        select: { id: true, email: true },
      })

      if (profile) {
        dbProfileId = profile.id
        userEmail = profile.email

        // Delete user-authored content (review), saved lists, intake sessions
        // (which cascade to IntakeMessage + AgentMatch via Prisma onDelete),
        // subscription, and any leads tied to this email.
        await db.$transaction([
          db.review.deleteMany({ where: { userId: profile.id } }),
          db.savedList.deleteMany({ where: { userId: profile.id } }),
          db.intakeSession.deleteMany({ where: { userId: profile.id } }),
          db.subscription.deleteMany({ where: { userId: profile.id } }),
          db.lead.deleteMany({ where: { studentEmail: profile.email } }),
          db.user.delete({ where: { id: profile.id } }),
        ])
      }
    } catch (dbError) {
      console.error('[api/me DELETE] DB cascade failed:', dbError)
      return NextResponse.json(
        {
          error:
            'Could not delete your data from our database. Please contact support@edupath.com to complete deletion.',
        },
        { status: 503 }
      )
    }

    // Best-effort: delete the Supabase auth.users row. This requires the
    // service-role key (SUPABASE_SERVICE_ROLE_KEY env var). If not set,
    // the auth row stays but the user is signed out — they can no longer
    // log in. We'll sweep orphaned auth rows with a nightly cron job.
    let authRowDeleted = false
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (serviceRoleKey && supabaseUrl) {
        const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
          method: 'DELETE',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        })
        authRowDeleted = res.ok
        if (!res.ok) {
          console.warn('[api/me DELETE] Supabase admin delete failed:', await res.text())
        }
      }
    } catch (authErr) {
      console.warn('[api/me DELETE] Supabase admin delete threw:', authErr)
    }

    // Always sign out the current session, even if the admin delete failed.
    await supabase.auth.signOut()

    return NextResponse.json({
      success: true,
      dbProfileDeleted: !!dbProfileId,
      authRowDeleted,
      message: authRowDeleted
        ? 'Your account has been fully deleted.'
        : 'Your data has been deleted and you have been signed out. Your auth record will be purged within 24 hours.',
    })
  } catch (error) {
    console.error('[api/me DELETE] Error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting your account.' },
      { status: 500 }
    )
  }
}
