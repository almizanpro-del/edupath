/**
 * POST /api/leads
 * Submit a lead (contact form) from a student to a university.
 * Creates a Lead record + tracks a contact_form analytics event.
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { trackEvent } from '@/lib/analytics'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { universityId, studentName, studentEmail, country, gpa, field, message } = body

    // Validation
    if (!universityId || !studentName || !studentEmail || !message) {
      return NextResponse.json({ error: 'universityId, studentName, studentEmail, and message are required' }, { status: 400 })
    }
    if (message.trim().length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
    }

    // Check university exists
    const uni = await db.university.findUnique({ where: { id: universityId } })
    if (!uni) {
      return NextResponse.json({ error: 'University not found' }, { status: 404 })
    }

    // Create lead
    const lead = await db.lead.create({
      data: {
        universityId,
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim(),
        country: country || 'Unknown',
        gpa: gpa ? Number(gpa) : null,
        field: field || null,
        message: message.trim().slice(0, 2000),
      },
    })

    // Track analytics event
    await trackEvent({
      eventType: 'contact_form',
      universityId,
      metadata: { leadId: lead.id, field, gpa },
    })

    return NextResponse.json({ leadId: lead.id, status: 'created' })
  } catch (error) {
    console.error('[api/leads] Error:', error)
    return NextResponse.json(
      { error: 'Lead submission requires a database connection. This feature is unavailable in demo mode.' },
      { status: 503 }
    )
  }
}
