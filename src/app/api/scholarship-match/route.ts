/**
 * POST /api/scholarship-match
 * Scholarship matching with deterministic scoring + optional LLM enhancement.
 *
 * Works WITHOUT an LLM — uses heuristic scoring based on GPA, field, budget,
 * and country. LLM is only used for "why you match" explanations if available.
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

type MatchResult = {
  scholarshipId: string
  matchScore: number
  reasoning: string
  tips: string
  scholarship: Scholarship
}

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  // Rate limit: 10 matches per hour per IP (was 3 — now deterministic, cheaper)
  const limited = rateLimit(req, { windowMs: 60 * 60_000, max: 10, prefix: 'scholarship-match' })
  if (limited) return limited

  try {
    const body = await req.json()
    const validation = validateBody(scholarshipMatchSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { gpa, field, country, degreeLevel } = validation.data

    // Fetch all scholarships
    let scholarships: Scholarship[] = []
    try {
      const unis = await db.university.findMany({
        select: {
          name: true, country: true,
          scholarships: {
            select: { id: true, name: true, amountUsd: true, amountType: true, eligibility: true, deadline: true },
          },
        },
      })
      scholarships = unis.flatMap(u =>
        u.scholarships.map(s => ({
          ...s,
          universityName: u.name,
          universityCountry: u.country,
        }))
      )
    } catch {
      scholarships = (staticUniversities as unknown as Array<{
        name: string; country: string
        scholarships: Array<{ id: string; name: string; amountUsd: number; amountType: string; eligibility: string; deadline: string | null }>
      }>).flatMap(u =>
        u.scholarships.map(s => ({
          ...s,
          universityName: u.name,
          universityCountry: u.country,
        }))
      )
    }

    if (scholarships.length === 0) {
      return NextResponse.json({ matches: [], totalScholarships: 0 })
    }

    // DETERMINISTIC SCORING (works without LLM)
    const matches: MatchResult[] = scholarships
      .map(s => {
        let score = 0
        const eligibility = (s.eligibility || '').toLowerCase()

        // GPA match (40 pts)
        if (eligibility.includes('gpa')) {
          const reqGpaMatch = eligibility.match(/gpa[:\s]+([0-9.]+)/)
          if (reqGpaMatch) {
            const reqGpa = parseFloat(reqGpaMatch[1])
            if (gpa >= reqGpa) {
              score += 40
            } else if (gpa >= reqGpa - 0.3) {
              score += 20 // Close but not meeting requirement
            }
          }
        } else {
          // No GPA requirement stated — give neutral score
          score += 25
        }

        // Field match (30 pts)
        if (field && eligibility.toLowerCase().includes(field.toLowerCase())) {
          score += 30
        } else if (!eligibility || eligibility.includes('all') || eligibility.includes('any')) {
          // Open to all fields
          score += 20
        } else {
          score += 10
        }

        // Country match (15 pts) — scholarship in student's country or open to all
        if (country && s.universityCountry.toLowerCase().includes(country.toLowerCase())) {
          score += 15
        } else if (eligibility.includes('international') || eligibility.includes('all countries') || eligibility.includes('any')) {
          score += 12
        } else {
          score += 5
        }

        // Degree level (10 pts)
        if (degreeLevel && eligibility.toLowerCase().includes(degreeLevel.toLowerCase())) {
          score += 10
        } else if (!eligibility || eligibility.length < 20) {
          score += 7 // Vague eligibility — probably open
        }

        // Amount bonus (5 pts) — higher scholarships get slight bonus
        if (s.amountUsd > 5000) score += 5
        else if (s.amountUsd > 1000) score += 3

        // Generate deterministic reasoning
        const reasons: string[] = []
        if (score >= 70) {
          reasons.push('Strong match based on your profile')
        } else if (score >= 50) {
          reasons.push('Good potential match — check eligibility details')
        } else {
          reasons.push('May not meet all requirements — verify before applying')
        }

        if (field && eligibility.toLowerCase().includes(field.toLowerCase())) {
          reasons.push(`specifically targets ${field} students`)
        }
        if (gpa >= 3.5) {
          reasons.push('your high GPA strengthens your application')
        }
        if (s.amountType === 'full') {
          reasons.push('covers full tuition')
        }

        // Generate tips
        const tips: string[] = []
        if (s.deadline) {
          tips.push(`Apply before ${s.deadline}`)
        }
        if (gpa < 3.0) {
          tips.push('Consider improving your GPA to strengthen your application')
        }
        tips.push('Prepare a strong personal statement highlighting your background')
        if (s.universityCountry !== country) {
          tips.push(`Research visa requirements for ${s.universityCountry}`)
        }

        return {
          scholarshipId: s.id,
          matchScore: Math.min(score, 100),
          reasoning: reasons.join(', '),
          tips: tips.join('. '),
          scholarship: s,
        }
      })
      .filter(m => m.matchScore >= 30) // Exclude very low matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)

    // Optionally enhance with LLM (non-blocking — fall back to deterministic)
    try {
      const llmAvailable = await checkLlmAvailable()
      if (llmAvailable && matches.length > 0) {
        // Enhance top 5 matches with LLM explanations
        const top5 = matches.slice(0, 5)
        const enhanced = await Promise.all(
          top5.map(async (m) => {
            try {
              const result = await chatCompletion(
                [
                  { role: 'system', content: 'You are a scholarship advisor for MENA students. Write in English. Be concise (1 sentence).' },
                  { role: 'user', content: `Student: GPA ${gpa}, field ${field}, country ${country}. Scholarship: ${m.scholarship.name} at ${m.scholarship.universityName}. Eligibility: ${m.scholarship.eligibility}. Write one sentence explaining why this is a good match.` },
                ],
                { thinkingDisabled: true }
              )
              return { ...m, reasoning: result.content }
            } catch {
              return m // Keep deterministic reasoning
            }
          })
        )
        // Replace top 5 with enhanced versions
        matches.splice(0, 5, ...enhanced)
      }
    } catch {
      // LLM enhancement failed — use deterministic results (already set)
    }

    return NextResponse.json({
      matches,
      totalScholarships: scholarships.length,
      scoringMethod: 'deterministic',
    })
  } catch (error) {
    console.error('[api/scholarship-match] Error:', error)
    return NextResponse.json(
      { error: 'Scholarship matching failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Quick check if any LLM provider is available (without making a full request).
 */
async function checkLlmAvailable(): Promise<boolean> {
  // Check if we're in the ZAI sandbox (ZAI.create() will work)
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    await ZAI.create()
    return true
  } catch {
    // Not in sandbox — check env vars
    return !!(process.env.OPENAI_API_KEY || process.env.XAI_API_KEY || process.env.GROK_API_KEY)
  }
}
