/**
 * POST /api/family/accept
 *
 * Accepts a parent invitation by linking the currently authenticated user
 * as the parent on the ParentInvitation record.
 *
 * Body: { token: string }  — the invite token from the email link
 *
 * Flow:
 *   1. Validate the token — find the ParentInvitation with status 'pending'
 *   2. Check the current user isn't the student who sent the invite (can't accept your own invite)
 *   3. Link parentId, set status='accepted', set acceptedAt
 *   4. Return success — the parent is now linked and can view the student's dashboard
 *
 * If the user isn't authenticated, the client should prompt them to sign up
 * first, then call this endpoint.
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1).max(100),
})

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please sign up or sign in first.' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = schema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    // Find the current user's profile
    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, name: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Find the invitation
    const invitation = await db.parentInvitation.findUnique({
      where: { inviteToken: validation.data.token },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found. Please check your link.' }, { status: 404 })
    }

    if (invitation.status === 'accepted') {
      // If this user is already the parent, that's fine — idempotent
      if (invitation.parentId === profile.id) {
        return NextResponse.json({ alreadyAccepted: true, studentId: invitation.studentId })
      }
      return NextResponse.json({ error: 'This invitation has already been accepted by someone else.' }, { status: 409 })
    }

    if (invitation.status === 'revoked') {
      return NextResponse.json({ error: 'This invitation has been revoked.' }, { status: 410 })
    }

    // Can't accept your own invitation
    if (invitation.studentId === profile.id) {
      return NextResponse.json({ error: 'You cannot accept your own invitation.' }, { status: 400 })
    }

    // Accept the invitation
    await db.parentInvitation.update({
      where: { id: invitation.id },
      data: {
        parentId: profile.id,
        status: 'accepted',
        acceptedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      studentId: invitation.studentId,
      invitationId: invitation.id,
    })
  } catch (error) {
    console.error('[api/family/accept] Error:', error)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }
}
