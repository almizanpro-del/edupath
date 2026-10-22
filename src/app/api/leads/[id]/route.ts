/**
 * PATCH /api/leads/{id}
 *
 * Updates a lead's status (new → contacted → closed) and/or appends a
 * recruiter reply to the conversation thread.
 *
 * Body:
 *   {
 *     status?: "new" | "contacted" | "closed",
 *     reply?: { body: string }  // append a recruiter message
 *   }
 *
 * Auth: requires recruiter or admin role. Recruiters can only update
 * leads for their own university; admins can update any lead.
 *
 * When a reply is appended, we also fire a notification email to the
 * student (best-effort, non-blocking).
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'
import { z } from 'zod'

const schema = z.object({
  status: z.enum(['new', 'contacted', 'closed']).optional(),
  reply: z.object({ body: z.string().trim().min(1).max(5000) }).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, role: true, name: true, email: true, fieldOfInterest: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.role !== 'recruiter' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Recruiter or admin access required' }, { status: 403 })
    }

    const { id: leadId } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = schema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json(
        { error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Invalid input' },
        { status: 400 }
      )
    }

    // Load the lead (with university for scope check + email notification)
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { university: { select: { id: true, name: true } } },
    })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Recruiters can only touch leads for their own university
    if (profile.role === 'recruiter' && profile.fieldOfInterest !== lead.universityId) {
      return NextResponse.json({ error: 'You can only manage leads for your own university' }, { status: 403 })
    }

    const updates: { status?: string } = {}
    if (validation.data.status) {
      updates.status = validation.data.status
    }

    // Append reply if provided
    type LeadMessageType = {
      id: string
      fromRole: string
      authorName: string
      body: string
      createdAt: Date
    }
    let newMessage: LeadMessageType | null = null
    if (validation.data.reply) {
      const created = await db.leadMessage.create({
        data: {
          leadId: lead.id,
          fromRole: 'recruiter',
          authorName: profile.name,
          authorEmail: profile.email,
          body: validation.data.reply.body,
        },
      })
      newMessage = {
        id: created.id,
        fromRole: created.fromRole,
        authorName: created.authorName,
        body: created.body,
        createdAt: created.createdAt,
      }

      // If status wasn't explicitly set, auto-flip to "contacted"
      if (!updates.status && lead.status === 'new') {
        updates.status = 'contacted'
      }

      // Best-effort: email the student about the reply
      try {
        const { sendLeadReplyEmail } = await import('@/lib/email')
        await sendLeadReplyEmail(lead.studentEmail, {
          studentName: lead.studentName,
          universityName: lead.university.name,
          recruiterName: profile.name,
          message: validation.data.reply.body,
        })
      } catch (emailErr) {
        console.warn('[api/leads PATCH] Reply email failed:', emailErr)
        // Non-critical
      }
    }

    // Apply status update if any
    let updatedLead = lead
    if (Object.keys(updates).length > 0) {
      updatedLead = await db.lead.update({
        where: { id: leadId },
        data: updates,
        include: { university: { select: { id: true, name: true } } },
      })
    }

    return NextResponse.json({
      lead: {
        id: updatedLead.id,
        status: updatedLead.status,
        universityName: updatedLead.university.name,
      },
      message: newMessage
        ? {
            id: newMessage.id,
            fromRole: newMessage.fromRole,
            authorName: newMessage.authorName,
            body: newMessage.body,
            createdAt: newMessage.createdAt.toISOString(),
          }
        : null,
    })
  } catch (error) {
    console.error('[api/leads/[id] PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update lead. The database may be unavailable.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/leads/{id}
 * Returns a single lead with its full conversation thread.
 * Used by the sponsor dashboard's lead detail view.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, role: true, fieldOfInterest: true },
    })
    if (!profile || (profile.role !== 'recruiter' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Recruiter or admin access required' }, { status: 403 })
    }

    const { id: leadId } = await params
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        university: { select: { id: true, name: true, slug: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Scope check for recruiters
    if (profile.role === 'recruiter' && profile.fieldOfInterest !== lead.universityId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      lead: {
        id: lead.id,
        studentName: lead.studentName,
        studentEmail: lead.studentEmail,
        country: lead.country,
        gpa: lead.gpa,
        field: lead.field,
        message: lead.message,
        status: lead.status,
        createdAt: lead.createdAt.toISOString(),
        university: {
          id: lead.university.id,
          name: lead.university.name,
          slug: lead.university.slug,
        },
        messages: lead.messages.map(m => ({
          id: m.id,
          fromRole: m.fromRole,
          authorName: m.authorName,
          authorEmail: m.authorEmail,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error('[api/leads/[id] GET] Error:', error)
    return NextResponse.json({ error: 'Failed to load lead' }, { status: 500 })
  }
}
