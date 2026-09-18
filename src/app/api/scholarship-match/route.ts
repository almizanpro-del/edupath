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
import ZAI from 'z-ai-web-dev-sdk'

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
  try {
    const body = await req.json()
    const { gpa, field, country, languageScore, budget, degreeLevel } = body

    // Validate
    if (!gpa || !field) {
      return NextResponse.json({ error: 'GPA and field of study are required' }, { status: 400 })
    }

    // Fetch all scholarships
    let scholarships: Scholarship[] = []
    try {
      const unis = await db.university.findMany({
        include: { scholarships: true },
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

    // Use AI to rank scholarships
    const zai = await ZAI.create()
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

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    let raw = completion.choices[0]?.message?.content ?? ''
    // Clean markdown fences
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '')
    }
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      raw = raw.substring(start, end + 1)
    }

    const result = JSON.parse(raw)
    const matches = (result.matches || []).map((m: { scholarshipId: string; matchScore: number; reasoning: string; tips: string }) => {
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
