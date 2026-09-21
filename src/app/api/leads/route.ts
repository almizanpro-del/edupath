/**
 * POST /api/leads
 * Submit a lead (contact form) from a student to a university.
 * Creates a Lead record + tracks a contact_form analytics event.
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { trackEvent } from '@/lib/analytics'
import { requireSameOrigin } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'
import { leadSchema, validateBody } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  // Rate limit: 5 leads per minute per IP (prevents mass-mail abuse)
  const limited = rateLimit(req, { windowMs: 60_000, max: 5, prefix: 'leads' })
  if (limited) return limited

  try {
    const body = await req.json()
    const validation = validateBody(leadSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { universityId, studentName, studentEmail, country, gpa, field, message } = validation.data

    // Check university exists
    const uni = await db.university.findUnique({
      where: { id: universityId },
      select: { id: true, name: true },
    })
    if (!uni) {
      return NextResponse.json({ error: 'University not found' }, { status: 404 })
    }

    // Create lead — zod already validated types, sanitize for XSS
    const { sanitizeText, sanitizeEmail, isSafeInput } = await import('@/lib/sanitize')
    if (!isSafeInput(message)) {
      return NextResponse.json({ error: 'Invalid content in message' }, { status: 400 })
    }
    const safeName = sanitizeText(studentName)
    const safeEmail = sanitizeEmail(studentEmail)
    if (!safeEmail) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    const safeMessage = sanitizeText(message)
    const safeCountry = country ? sanitizeText(country) : 'Unknown'
    const safeField = field ? sanitizeText(field) : null

    const lead = await db.lead.create({
      data: {
        universityId,
        studentName: safeName,
        studentEmail: safeEmail,
        country: safeCountry,
        gpa: gpa ?? null,
        field: safeField,
        message: safeMessage,
      },
    })

    // Track analytics event
    await trackEvent({
      eventType: 'contact_form',
      universityId,
      metadata: { leadId: lead.id, field: safeField, gpa },
    })

    // Send email notification to the university + platform admins (if email is configured)
    try {
      const { sendLeadNotificationEmail } = await import('@/lib/email')
      const leadData = {
        studentName: safeName, studentEmail: safeEmail,
        country: safeCountry, gpa: gpa ?? null,
        field: safeField, message: safeMessage,
        universityName: uni.name,
      }
      // 1. Email platform admins (always)
      await sendLeadNotificationEmail('sponsor@edupath.com', leadData)
      // 2. If the university has a claimed sponsor email, email them directly
      const sponsor = await db.user.findFirst({
        where: { role: 'recruiter', fieldOfInterest: uni.id },
        select: { email: true },
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
