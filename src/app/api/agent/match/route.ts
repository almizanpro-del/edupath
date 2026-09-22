/**
 * POST /api/agent/match
 * Generate personalized university matches for a completed intake session.
 *
 * Body: { sessionId: string }
 * Response: { matches: AgentMatchResult[] }
 *
 * Requires a completed intake session. Persists matches to AgentMatch table.
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'
import { findMatches } from '@/lib/agent/matcher'
import type { IntakeProfile } from '@/lib/agent/rihla'

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  // Rate limit: 5 match requests per minute per IP
  const limited = rateLimit(req, { windowMs: 60_000, max: 5, prefix: 'agent-match' })
  if (limited) return limited

  try {
    const { sessionId } = await req.json() as { sessionId?: string }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const session = await db.intakeSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Intake not complete. Finish the conversation first.' },
        { status: 400 }
      )
    }

    // Build profile from session
    const profile: IntakeProfile = {
      nationality: session.nationality ?? undefined,
      educationLevel: session.educationLevel ?? undefined,
      fieldOfInterest: session.fieldOfInterest ?? undefined,
      preferredCountries: session.preferredCountries
        ? JSON.parse(session.preferredCountries)
        : [],
      budgetUsd: session.budgetUsd ?? undefined,
      languagePref: session.languagePref ?? undefined,
      degreeLevel: session.degreeLevel ?? undefined,
      careerGoal: session.careerGoal ?? undefined,
      specialRequirements: session.specialRequirements ?? undefined,
      language: session.language,
    }

    // Find matches
    const matches = await findMatches(profile)

    // Persist matches to DB (delete old ones first if re-running)
    await db.agentMatch.deleteMany({ where: { sessionId } })
    if (matches.length > 0) {
      await db.agentMatch.createMany({
        data: matches.map(m => ({
          sessionId,
          universityId: m.id,
          programId: m.matchedProgram?.id ?? null,
          relevanceScore: m.relevanceScore,
          explanation: m.explanation,
        })),
      })
    }

    return NextResponse.json({
      matches: matches.map(m => ({
        universityId: m.id,
        slug: m.slug,
        name: m.name,
        country: m.country,
        city: m.city,
        website: m.website,
        tuitionUsd: m.tuitionUsd,
        livingCostUsd: m.livingCostUsd,
        intlStudentPct: m.intlStudentPct,
        acceptanceRate: m.acceptanceRate,
        logoUrl: m.logoUrl,
        relevanceScore: m.relevanceScore,
        explanation: m.explanation,
        matchedProgram: m.matchedProgram
          ? {
              id: m.matchedProgram.id,
              name: m.matchedProgram.name,
              field: m.matchedProgram.field,
              degreeLevel: m.matchedProgram.degreeLevel,
              language: m.matchedProgram.language,
              tuitionUsd: m.matchedProgram.tuitionUsd,
            }
          : null,
        scholarships: m.scholarships.slice(0, 3),
      })),
      profile,
    })
  } catch (error) {
    console.error('[api/agent/match] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate matches. Please try again.' },
      { status: 500 }
    )
  }
}
