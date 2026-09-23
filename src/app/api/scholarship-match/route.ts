/**
 * POST /api/scholarship-match
 * AI-powered scholarship matching using z-ai-web-dev-sdk.
 *
 * User provides their profile (GPA, field, country, language scores, budget).
 * AI reviews all scholarships and returns ranked matches with match scores
 * and reasoning for each.
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import { chatCompletion } from '@/lib/llm'
import { requireSameOrigin } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'
import { scholarshipMatchSchema, validateBody } from '@/lib/validation'

type Scholarship = {
  id: string
  name: string
  amountUsd: number
  amountType: string
  eligibility: string
  deadline: string | null
  universityName: string
  universityCountry: string
}

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  // Rate limit: 3 matches per hour per IP (LLM calls are expensive)
  const limited = rateLimit(req, { windowMs: 60 * 60_000, max: 3, prefix: 'scholarship-match' })
  if (limited) return limited

  try {
    const body = await req.json()
    const validation = validateBody(scholarshipMatchSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { gpa, field, country, degreeLevel } = validation.data
    const languageScore = typeof body.languageScore === 'number' ? body.languageScore : undefined
    const budget = typeof body.budget === 'number' ? body.budget : undefined

    // Fetch all scholarships (with select to limit payload)
    let scholarships: Scholarship[] = []
    try {
      const unis = await db.university.findMany({
        select: {
          name: true,
          country: true,
          scholarships: {
            select: {
              id: true, name: true, amountUsd: true, amountType: true,
              eligibility: true, deadline: true,
            },
          },
        },
      })
      scholarships = unis.flatMap(u =>
        u.scholarships.map(s => ({
          id: s.id,
          name: s.name,
          amountUsd: s.amountUsd,
          amountType: s.amountType,
          eligibility: s.eligibility,
          deadline: s.deadline,
          universityName: u.name,
          universityCountry: u.country,
        }))
      )
    } catch {
      // Static fallback
      scholarships = (staticUniversities as Array<{ name: string; country: string; scholarships: Array<{ id: string; name: string; amountUsd: number; amountType: string; eligibility: string; deadline: string | null }> }>)
        .flatMap(u => u.scholarships.map(s => ({
          id: s.id, name: s.name, amountUsd: s.amountUsd, amountType: s.amountType,
          eligibility: s.eligibility, deadline: s.deadline,
          universityName: u.name, universityCountry: u.country,
        })))
    }

    if (scholarships.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    // Use AI to rank scholarships (unified multi-provider LLM client)
    const systemPrompt = `You are an expert scholarship matcher for MENA students applying to international universities. You analyze student profiles and scholarship eligibility criteria to find the best matches.

Respond with STRICT JSON only (no markdown, no code fences). Schema:
{
  "matches": [
    {
      "scholarshipId": "<id from the list>",
      "matchScore": <0-100>,
      "reasoning": "<1-2 sentences explaining why this is a good match>",
      "tips": "<specific tip for improving chances>"
    }
  ]
}

Rules:
- Only include scholarships where the student meets BASIC eligibility (GPA, field relevance)
- Sort by matchScore descending
- matchScore: 90+ = excellent match, 70-89 = good match, 50-69 = possible match, <50 = exclude
- Include at most 8 matches
- Be realistic — don't match if GPA is below stated requirements`

    const userPrompt = `Student profile:
- GPA: ${gpa} (on 4.0 scale)
- Field of study: ${field}
- Home country: ${country || 'Not specified'}
- Language score: ${languageScore || 'Not specified'}
- Annual budget (USD): ${budget || 'Not specified'}
- Degree level: ${degreeLevel || 'Not specified'}

Available scholarships (JSON):
${JSON.stringify(scholarships, null, 2)}

Find the best matches for this student. Respond with ONLY valid JSON.`

    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { thinkingDisabled: true }
    )

    let raw = result.content ?? ''
    // Clean markdown fences
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '')
    }
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      raw = raw.substring(start, end + 1)
    }

    const parsed = JSON.parse(raw)
    const matches = (parsed.matches || []).map((m: { scholarshipId: string; matchScore: number; reasoning: string; tips: string }) => {
      const scholarship = scholarships.find(s => s.id === m.scholarshipId)
      return { ...m, scholarship }
    }).filter((m: { scholarship: Scholarship }) => m.scholarship)

    return NextResponse.json({ matches, totalScholarships: scholarships.length })
  } catch (error) {
    console.error('[api/scholarship-match] Error:', error)
    return NextResponse.json(
      { error: 'Scholarship matching failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
