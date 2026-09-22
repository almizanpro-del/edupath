/**
 * POST /api/agent/intake
 * Conversational intake for the Rihla AI agent.
 *
 * Body: { sessionId?: string, message: string, language?: "en" | "ar" }
 * Response: { sessionId, reply, intakeComplete, profile? }
 *
 * Uses z-ai-web-dev-sdk (same LLM SDK as essay-review and scholarship-match).
 * Graceful degradation: if the LLM call fails, returns a fallback message.
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { requireSameOrigin } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'
import { buildMessages, parseIntakeComplete, isIntakeComplete, type IntakeProfile } from '@/lib/agent/rihla'
import { trackEvent } from '@/lib/analytics'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  // Rate limit: 20 messages per minute per IP
  const limited = rateLimit(req, { windowMs: 60_000, max: 20, prefix: 'agent-intake' })
  if (limited) return limited

  try {
    const body = await req.json()
    const { sessionId, message, language = 'en' } = body as {
      sessionId?: string
      message: string
      language?: string
    }

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json({ error: 'Message is required (max 2000 chars)' }, { status: 400 })
    }

    // Get user if authenticated (optional — intake can be anonymous)
    let userId: string | undefined
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const profile = await db.user.findUnique({
          where: { supabaseId: user.id },
          select: { id: true },
        })
        if (profile) userId = profile.id
      }
    } catch {
      // Auth unavailable — continue as anonymous
    }

    // 1. Get or create session
    let session
    if (sessionId) {
      session = await db.intakeSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
    } else {
      session = await db.intakeSession.create({
        data: {
          userId,
          language,
          messages: { create: [] },
        },
        include: { messages: true },
      })
    }

    // 2. Persist user message
    await db.intakeMessage.create({
      data: { sessionId: session.id, role: 'user', content: message },
    })

    // 3. Build LLM message history
    const messages = buildMessages(
      session.messages.map(m => ({ role: m.role, content: m.content })),
      message,
      language
    )

    // 4. Call LLM (z-ai-web-dev-sdk)
    let reply: string
    let llmFailed = false
    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 500,
      })
      reply = completion.choices[0]?.message?.content || ''
      if (!reply) throw new Error('Empty LLM response')
    } catch (err) {
      console.error('[api/agent/intake] LLM error:', err)
      llmFailed = true
      // Graceful degradation — fallback to structured mode
      reply = language === 'ar'
        ? 'عذراً، أواجه مشكلة تقنية حالياً. يرجى المحاولة مرة أخرى أو املأ النموذج اليدوي.'
        : "I'm having a technical issue right now. Please try again or use the manual filter."
    }

    // 5. Persist assistant message
    await db.intakeMessage.create({
      data: { sessionId: session.id, role: 'assistant', content: reply },
    })

    // 6. Detect completion
    const intakeComplete = !llmFailed && isIntakeComplete(reply)
    let profile: IntakeProfile | null = null

    if (intakeComplete) {
      profile = parseIntakeComplete(reply)
      if (profile) {
        // Update session with structured profile
        await db.intakeSession.update({
          where: { id: session.id },
          data: {
            status: 'completed',
            nationality: profile.nationality ?? null,
            educationLevel: profile.educationLevel ?? null,
            fieldOfInterest: profile.fieldOfInterest ?? null,
            preferredCountries: JSON.stringify(profile.preferredCountries || []),
            budgetUsd: profile.budgetUsd ?? null,
            languagePref: profile.languagePref ?? null,
            degreeLevel: profile.degreeLevel ?? null,
            careerGoal: profile.careerGoal ?? null,
            specialRequirements: profile.specialRequirements ?? null,
          },
        })

        // Track analytics
        await trackEvent({
          eventType: 'university_view',
          metadata: { action: 'rihla_intake_complete', sessionId: session.id },
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      reply,
      intakeComplete,
      profile,
      llmFailed,
    })
  } catch (error) {
    console.error('[api/agent/intake] Error:', error)
    return NextResponse.json(
      { error: 'Agent intake failed. Please try again.' },
      { status: 500 }
    )
  }
}
