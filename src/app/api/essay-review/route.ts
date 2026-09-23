/**
 * POST /api/essay-review
 * Reviews a university application essay using AI (z-ai-web-dev-sdk).
 *
 * Requires authentication. Returns structured JSON with:
 * - 4 dimension scores (structure, tone, clarity, cultural_fit) each 1-5
 * - Overall score
 * - Strengths and weaknesses
 * - Line-level feedback (quote, issue, suggestion)
 * - Rewrite summary
 *
 * Rate limiting: 3 reviews per hour per user (in-memory, per-instance).
 * Note: in serverless, each instance has its own map — for true distributed
 * limiting, use Upstash Redis or DB-backed tracking.
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatCompletion } from '@/lib/llm'
import { requireSameOrigin } from '@/lib/csrf'
import { essayReviewSchema, validateBody } from '@/lib/validation'

// In-memory per-user rate limiting (per server instance)
const reviewTimestamps = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 3 // 3 reviews per hour per user

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const timestamps = reviewTimestamps.get(userId) ?? []
  const recent = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 }
  }
  reviewTimestamps.set(userId, [...recent, now])
  return { allowed: true, remaining: RATE_LIMIT_MAX - recent.length - 1 }
}

const SYSTEM_PROMPT = `You are an expert university admissions reviewer for MENA students applying to international universities. You evaluate essays on four dimensions, each scored 1-5 with rubric anchors.

DIMENSION 1 - STRUCTURE (1-5):
  5: Clear thesis in intro, 2-3 body paragraphs with topic sentences, conclusion that restates thesis and adds reflection. Transitions between paragraphs are explicit.
  3: Has intro/body/conclusion but transitions are weak or topic sentences are missing. Thesis is implied but not stated.
  1: No discernible structure. Stream of consciousness.

DIMENSION 2 - TONE (1-5):
  5: Confident, specific, reflective. Avoids cliches ("ever since I was a child", "I want to make the world a better place"). Uses concrete details instead of abstractions.
  3: Mostly appropriate tone but relies on 1-2 cliches or vague abstractions. Some sections feel performative.
  1: Defensive, arrogant, or excessively self-deprecating. Heavy cliche use throughout.

DIMENSION 3 - CLARITY (1-5):
  5: Every sentence is necessary. No redundancy. Vocabulary is precise (not showy). Sentence length varies for rhythm.
  3: Some redundancy or filler. Vocabulary is acceptable but imprecise in places.
  1: Confusing. Long wandering sentences. Vocabulary errors impede comprehension.

DIMENSION 4 - CULTURAL FIT (1-5):
  5: Demonstrates specific knowledge of the target university and program (named faculty, courses, research labs, values). Explains why this program is the right fit for the applicant's background and goals.
  3: Mentions the university by name but with generic reasons ("good reputation", "diverse student body").
  1: Could be submitted to any university. No personalization.

You MUST respond with STRICT JSON only (no markdown, no code fences, no preamble). The JSON must conform to this exact schema:

{
  "scores": {
    "structure": <integer 1-5>,
    "tone": <integer 1-5>,
    "clarity": <integer 1-5>,
    "cultural_fit": <integer 1-5>
  },
  "overall_score": <integer 1-5>,
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>", "<specific weakness 3>"],
  "line_feedback": [
    {
      "quote": "<exact phrase from the essay>",
      "issue": "<what the issue is>",
      "suggestion": "<how to improve it>"
    }
  ],
  "rewrite_summary": "<2-3 sentence summary of the most impactful improvements to make>"
}

Rules:
- Cite EXACT phrases from the essay in line_feedback quotes
- Be specific and actionable — no generic advice
- If the essay is excellent, still find 2-3 areas for improvement
- If the essay is poor, still find 2-3 strengths to encourage
- Respond in the same language as the essay (English essay → English feedback, Arabic essay → Arabic feedback)`

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limit check
    const rateLimit = checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: 'You can submit up to 3 essay reviews per hour. Please try again later.',
        retryAfterMinutes: 60,
      }, { status: 429 })
    }

    // Parse + validate request body
    const body = await req.json()
    const validation = validateBody(essayReviewSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { essayText } = validation.data
    const targetUniversity = typeof body.targetUniversity === 'string' ? body.targetUniversity : undefined
    const targetProgram = typeof body.targetProgram === 'string' ? body.targetProgram : undefined
    const applicantCountry = typeof body.applicantCountry === 'string' ? body.applicantCountry : undefined

    // Build user prompt
    const userPrompt = `Please review the following university application essay.

Target university: ${targetUniversity || 'Not specified'}
Target program: ${targetProgram || 'Not specified'}
Applicant country: ${applicantCountry || 'Not specified'}

ESSAY:
"""
${essayText.trim()}
"""

Evaluate this essay strictly per the rubric. Cite exact phrases from the essay in your line_feedback. Be specific and actionable. Respond with ONLY valid JSON — no markdown, no code fences, no preamble.`

    // Call AI (unified multi-provider LLM client)
    const result = await chatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { thinkingDisabled: true }
    )

    const rawResponse = result.content
    if (!rawResponse) {
      throw new Error('Empty response from AI')
    }

    // Parse JSON — handle case where AI wraps in markdown fences
    let cleaned = rawResponse.trim()
    // Remove markdown code fences if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '')
    }
    // Remove any leading/trailing non-JSON text
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in AI response')
    }
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1)

    const review = JSON.parse(cleaned)

    // Validate structure
    if (!review.scores || typeof review.overall_score !== 'number') {
      throw new Error('Invalid review structure from AI')
    }

    return NextResponse.json({
      review,
      remaining: rateLimit.remaining,
    })
  } catch (error) {
    console.error('[api/essay-review] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Essay review failed', message },
      { status: 500 }
    )
  }
}
