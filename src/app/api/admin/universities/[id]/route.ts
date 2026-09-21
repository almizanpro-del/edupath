/** PATCH/DELETE /api/admin/universities/[id] — update or delete a university */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'
import { adminUniversityPatchSchema, validateBody } from '@/lib/validation'

async function requireAdmin() {
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
      data: { supabaseId: user.id, email: user.email ?? '', name: 'Admin', country: 'Jordan', role: 'student' },
    })
  }
  return profile.role === 'admin' ? profile : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  const profile = await requireAdmin()
  if (!profile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const { id } = await params
    const body = await req.json()

    // Handle 'approve' action (legacy) or general update
    if (body.action === 'approve') {
      const uni = await db.university.update({
        where: { id },
        data: { pendingReview: false },
      })
      return NextResponse.json({ university: uni })
    }

    // Validate the update body
    const validation = validateBody(adminUniversityPatchSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const fields = validation.data

    const updateData: Record<string, unknown> = { ...fields }
    if (updateData.name) {
      updateData.slug = (updateData.name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }
    const uni = await db.university.update({ where: { id }, data: updateData })
    return NextResponse.json({ university: uni })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update university' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  const profile = await requireAdmin()
  if (!profile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const { id } = await params
    await db.university.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete university' }, { status: 500 })
  }
}
