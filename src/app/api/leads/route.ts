/**
 * POST /api/leads
 * Submit a lead (contact form) from a student to a university.
 * Creates a Lead record + tracks a contact_form analytics event.
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { trackEvent } from '@/lib/analytics'
import { requireSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

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
    // Sanitize all user input to prevent XSS
    const { sanitizeText, sanitizeEmail, isSafeInput } = await import('@/lib/sanitize')
    if (!isSafeInput(message)) {
      return NextResponse.json({ error: 'Invalid content in message' }, { status: 400 })
    }
    const safeName = sanitizeText(studentName.trim())
    const safeEmail = sanitizeEmail(studentEmail.trim())
    if (!safeEmail) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    const safeMessage = sanitizeText(message.trim().slice(0, 2000))
    const safeCountry = sanitizeText(country || 'Unknown')
    const safeField = field ? sanitizeText(field) : null

    const lead = await db.lead.create({
      data: {
        universityId,
        studentName: safeName,
        studentEmail: safeEmail,
        country: safeCountry,
        gpa: gpa ? Number(gpa) : null,
        field: safeField,
        message: safeMessage,
      },
    })

    // Track analytics event
    await trackEvent({
      eventType: 'contact_form',
      universityId,
      metadata: { leadId: lead.id, field, gpa },
    })

    // Send email notification to the university + platform admins (if email is configured)
    try {
      const { sendLeadNotificationEmail } = await import('@/lib/email')
      const leadData = {
        studentName: safeName, studentEmail: safeEmail,
        country: safeCountry, gpa: gpa ? Number(gpa) : null,
        field: safeField, message: safeMessage,
        universityName: uni.name,
      }
      // 1. Email platform admins (always)
      await sendLeadNotificationEmail('sponsor@edupath.com', leadData)
      // 2. If the university has a claimed sponsor email, email them directly
      const sponsor = await db.user.findFirst({
        where: { role: 'recruiter', fieldOfInterest: uni.id },
      }).catch(() => null)
      if (sponsor?.email) {
        await sendLeadNotificationEmail(sponsor.email, leadData)
      }
    } catch {
      // Email failed — don't block the lead creation
    }

    return NextResponse.json({ leadId: lead.id, status: 'created' })
  } catch (error) {
    console.error('[api/leads] Error:', error)
    return NextResponse.json(
      { error: 'Lead submission requires a database connection. This feature is unavailable in demo mode.' },
      { status: 503 }
    )
  }
}
