/**
 * /api/applications
 *
 * GET  — list the authenticated user's applications (with university + program info)
 * POST — create a new application tracker entry
 * PATCH — update an existing application (status, dates, notes)
 * DELETE — remove an application
 *
 * All endpoints require authentication.
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'
import { z } from 'zod'

const createSchema = z.object({
  universityId: z.string().min(1),
  programId: z.string().optional().nullable(),
  status: z.enum(['researching', 'applying', 'submitted', 'interviewing', 'decision', 'enrolled']).optional().default('researching'),
  deadlineAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional().default(''),
})

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['researching', 'applying', 'submitted', 'interviewing', 'decision', 'enrolled']).optional(),
  decision: z.enum(['accepted', 'rejected', 'waitlisted', 'deferred']).optional().nullable(),
  programId: z.string().optional().nullable(),
  appliedAt: z.string().datetime().optional().nullable(),
  deadlineAt: z.string().datetime().optional().nullable(),
  decisionAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    })
    if (!profile) return NextResponse.json({ applications: [] })

    const apps = await db.applicationTracker.findMany({
      where: { userId: profile.id },
      include: {
        university: { select: { id: true, name: true, slug: true, country: true, city: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      applications: apps.map(a => ({
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
      })),
    })
  } catch (error) {
    console.error('[api/applications GET] Error:', error)
    return NextResponse.json({ applications: [] })
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
      return NextResponse.json({ error: validation.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    // Check university exists
    const uni = await db.university.findUnique({
      where: { id: validation.data.universityId },
      select: { id: true },
    })
    if (!uni) return NextResponse.json({ error: 'University not found' }, { status: 404 })

    // Prevent duplicates (same user + same university)
    const existing = await db.applicationTracker.findFirst({
      where: { userId: profile.id, universityId: validation.data.universityId },
    })
    if (existing) {
      return NextResponse.json({ error: 'You are already tracking this university', id: existing.id }, { status: 409 })
    }

    const app = await db.applicationTracker.create({
      data: {
        userId: profile.id,
        universityId: validation.data.universityId,
        programId: validation.data.programId ?? null,
        status: validation.data.status,
        deadlineAt: validation.data.deadlineAt ? new Date(validation.data.deadlineAt) : null,
        notes: validation.data.notes,
      },
    })

    return NextResponse.json({ id: app.id, status: app.status })
  } catch (error) {
    console.error('[api/applications POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
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
      return NextResponse.json({ error: validation.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { id, ...updateData } = validation.data

    // Build update object with proper date conversions
    const dbUpdate: Record<string, unknown> = {}
    if (updateData.status) dbUpdate.status = updateData.status
    if (updateData.decision !== undefined) dbUpdate.decision = updateData.decision
    if (updateData.programId !== undefined) dbUpdate.programId = updateData.programId
    if (updateData.appliedAt !== undefined) dbUpdate.appliedAt = updateData.appliedAt ? new Date(updateData.appliedAt) : null
    if (updateData.deadlineAt !== undefined) dbUpdate.deadlineAt = updateData.deadlineAt ? new Date(updateData.deadlineAt) : null
    if (updateData.decisionAt !== undefined) dbUpdate.decisionAt = updateData.decisionAt ? new Date(updateData.decisionAt) : null
    if (updateData.notes !== undefined) dbUpdate.notes = updateData.notes

    const updated = await db.applicationTracker.updateMany({
      where: { id, userId: profile.id }, // scope to this user
      data: dbUpdate,
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/applications PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
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

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id param required' }, { status: 400 })

    await db.applicationTracker.deleteMany({
      where: { id, userId: profile.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/applications DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 })
  }
}
