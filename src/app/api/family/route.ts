/**
 * /api/family
 *
 * GET  — list the authenticated student's parent invitations
 * POST — create a new parent invitation (student invites a parent by email)
 * PATCH — update permission controls or revoke an invitation
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'
import { z } from 'zod'

const createSchema = z.object({
  parentEmail: z.string().email().max(320),
  parentName: z.string().trim().min(1).max(200).optional(),
})

const updateSchema = z.object({
  id: z.string().min(1),
  canSeeCosts: z.boolean().optional(),
  canSeeDeadlines: z.boolean().optional(),
  canSeeSafety: z.boolean().optional(),
  canSeeAcademic: z.boolean().optional(),
  canSeeDocuments: z.boolean().optional(),
  revoke: z.boolean().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, role: true },
    })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // If student: show their invitations. If parent (has parentId link): show their children.
    const sentInvitations = await db.parentInvitation.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, parentEmail: true, parentName: true, status: true,
        inviteToken: true, createdAt: true, acceptedAt: true,
        canSeeCosts: true, canSeeDeadlines: true, canSeeSafety: true,
        canSeeAcademic: true, canSeeDocuments: true,
      },
    })

    const receivedInvitations = await db.parentInvitation.findMany({
      where: { parentId: profile.id, status: 'accepted' },
      include: {
        student: { select: { id: true, name: true, country: true, fieldOfInterest: true } },
      },
    })

    return NextResponse.json({
      sent: sentInvitations,
      received: receivedInvitations.map(inv => ({
        id: inv.id,
        student: inv.student,
        permissions: {
          canSeeCosts: inv.canSeeCosts,
          canSeeDeadlines: inv.canSeeDeadlines,
          canSeeSafety: inv.canSeeSafety,
          canSeeAcademic: inv.canSeeAcademic,
          canSeeDocuments: inv.canSeeDocuments,
        },
      })),
    })
  } catch (error) {
    console.error('[api/family GET] Error:', error)
    return NextResponse.json({ sent: [], received: [] })
  }
}

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await req.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Valid parent email is required' }, { status: 400 })
    }

    // Check for duplicate pending invitations
    const existing = await db.parentInvitation.findFirst({
      where: { studentId: profile.id, parentEmail: validation.data.parentEmail, status: 'pending' },
    })
    if (existing) {
      return NextResponse.json({ error: 'You already have a pending invitation for this email', id: existing.id }, { status: 409 })
    }

    const invitation = await db.parentInvitation.create({
      data: {
        studentId: profile.id,
        parentEmail: validation.data.parentEmail,
        parentName: validation.data.parentName ?? null,
      },
    })

    // Best-effort: send invitation email
    try {
      const { sendFamilyInvitationEmail } = await import('@/lib/email')
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edupath-amber-three.vercel.app'
      await sendFamilyInvitationEmail(validation.data.parentEmail, {
        studentName: user.email?.split('@')[0] ?? 'Your child',
        inviteUrl: `${baseUrl}/family/join?token=${invitation.inviteToken}`,
      })
    } catch {
      // Non-critical
    }

    return NextResponse.json({ id: invitation.id, inviteToken: invitation.inviteToken })
  } catch (error) {
    console.error('[api/family POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await req.json()
    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { id, revoke, ...permissions } = validation.data

    if (revoke) {
      await db.parentInvitation.updateMany({
        where: { id, studentId: profile.id },
        data: { status: 'revoked' },
      })
      return NextResponse.json({ success: true, revoked: true })
    }

    await db.parentInvitation.updateMany({
      where: { id, studentId: profile.id },
      data: permissions,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/family PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 })
  }
}
