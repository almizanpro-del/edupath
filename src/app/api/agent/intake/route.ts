/**
 * POST /api/agent/intake
 * Conversational intake for the Rihla AI agent.
 *
 * Body: { sessionId?: string, message: string, language?: "en" | "ar" }
 * Response: { sessionId, reply, intakeComplete, profile? }
 *
 * Uses z-ai-web-dev-sdk (same LLM SDK as essay-review and scholarship-match).
 * Graceful degradation: if the LLM call fails, returns a fallback message.
 * If the DB is unavailable, runs in stateless mode (no persistence).
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { requireSameOrigin } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'
import { buildMessages, parseIntakeComplete, isIntakeComplete, type IntakeProfile } from '@/lib/agent/rihla'
import ZAI from 'z-ai-web-dev-sdk'

// In-memory session store for when DB is unavailable
const memorySessions = new Map<string, { language: string; messages: Array<{ role: string; content: string }> }>()

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

    // 1. Get or create session (with DB fallback to in-memory)
    let sessionIdOut: string
    let history: Array<{ role: string; content: string }> = []
    let dbAvailable = true

    try {
      if (sessionId) {
        const session = await db.intakeSession.findUnique({
          where: { id: sessionId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
        if (!session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }
        sessionIdOut = session.id
        history = session.messages.map(m => ({ role: m.role, content: m.content }))
      } else {
        const session = await db.intakeSession.create({
          data: {
            userId: userId ?? null,
            language,
          },
        })
        sessionIdOut = session.id
      }

      // 2. Persist user message
      await db.intakeMessage.create({
        data: { sessionId: sessionIdOut, role: 'user', content: message },
      })
    } catch (dbErr) {
      console.warn('[api/agent/intake] DB unavailable, using in-memory mode:', dbErr)
      dbAvailable = false
      // Fallback to in-memory sessions
      if (sessionId && memorySessions.has(sessionId)) {
        sessionIdOut = sessionId
        history = memorySessions.get(sessionId)!.messages
      } else {
        sessionIdOut = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        memorySessions.set(sessionIdOut, { language, messages: [] })
      }
      // Don't add the new message to history here — buildMessages will add it
    }

    // 3. Build LLM message history
    const messages = buildMessages(history, message, language)

    // 4. Call LLM (z-ai-web-dev-sdk)
    let reply: string
    let llmFailed = false
    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      })
      reply = completion.choices[0]?.message?.content || ''
      if (!reply) throw new Error('Empty LLM response')
    } catch (err) {
      console.error('[api/agent/intake] LLM error:', err)
      llmFailed = true
      reply = language === 'ar'
        ? 'عذراً، أواجه مشكلة تقنية حالياً. يرجى المحاولة مرة أخرى أو استخدم الفلاتر اليدوية في الصفحة الرئيسية.'
        : "I'm having a technical issue right now. Please try again, or use the manual filters on the home page."
    }

    // 5. Persist assistant message (if DB available)
    if (dbAvailable) {
      try {
        await db.intakeMessage.create({
          data: { sessionId: sessionIdOut, role: 'assistant', content: reply },
        })
      } catch {
        // Non-critical — message not persisted but conversation continues
      }
    } else {
      memorySessions.get(sessionIdOut)?.messages.push(
        { role: 'user', content: message },
        { role: 'assistant', content: reply }
      )
    }

    // 6. Detect completion
    const intakeComplete = !llmFailed && isIntakeComplete(reply)
    let profile: IntakeProfile | null = null

    if (intakeComplete) {
      profile = parseIntakeComplete(reply)
      if (profile && dbAvailable) {
        try {
          await db.intakeSession.update({
            where: { id: sessionIdOut },
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
        } catch {
          // Non-critical — profile not persisted but match can still work
        }
      }
    }

    return NextResponse.json({
      sessionId: sessionIdOut,
      reply,
      intakeComplete,
      profile,
      llmFailed,
    })
  } catch (error) {
    console.error('[api/agent/intake] Fatal error:', error)
    return NextResponse.json(
      { error: 'Agent intake failed. Please try again.' },
      { status: 500 }
    )
  }
}
