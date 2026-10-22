/**
 * POST /api/email/welcome
 *
 * Fires a welcome email after successful signup. Called best-effort from
 * the auth modal — non-blocking, non-critical.
 *
 * Body: { email: string, name: string }
 * Returns: 200 on success (or if email is not configured), 400 on bad input.
 *
 * Auth: requires a valid Supabase session (the caller just signed up, so
 * their session cookie is set). We don't strictly require auth here since
 * the welcome email is harmless, but we do CSRF-check via Origin header.
 */
import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { sendWelcomeEmail, isEmailConfigured } from '@/lib/email'
import { requireSameOrigin } from '@/lib/csrf'

const schema = z.object({
  email: z.string().email().max(320),
  name: z.string().trim().min(1).max(200),
})

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'email and name are required' },
      { status: 400 }
    )
  }

  if (!isEmailConfigured()) {
    // Email not configured — silently succeed so the client doesn't error.
    return NextResponse.json({ success: false, reason: 'email_not_configured' })
  }

  const sent = await sendWelcomeEmail(validation.data.email, validation.data.name)
  if (!sent) {
    return NextResponse.json({ success: false, reason: 'send_failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
