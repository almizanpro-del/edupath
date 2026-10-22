/**
 * /my-matches
 *
 * Shows the user's past Rihla AI intake sessions + their matches.
 * Each session card shows:
 *   - Date
 *   - Status (completed / abandoned)
 *   - The intake profile (nationality, field, budget, etc.)
 *   - The matches that were generated (university name, score, explanation)
 *   - A "Re-run with updated preferences" button
 */
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { MyMatchesClient } from './my-matches-client'

export const metadata: Metadata = {
  title: 'My Matches',
  description: 'Your past Rihla AI sessions and university matches.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function MyMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  let sessions: Array<{
    id: string
    language: string
    status: string
    nationality: string | null
    educationLevel: string | null
    fieldOfInterest: string | null
    preferredCountries: string[]
    budgetUsd: number | null
    languagePref: string | null
    degreeLevel: string | null
    careerGoal: string | null
    specialRequirements: string | null
    createdAt: Date
    matches: Array<{
      id: string
      relevanceScore: number
      explanation: string
      university: { id: string; name: string; slug: string; country: string; city: string }
      matchedProgram: { id: string; name: string; field: string } | null
    }>
  }> = []

  try {
    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    })

    if (profile) {
      const dbSessions = await db.intakeSession.findMany({
        where: { userId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          matches: {
            orderBy: { relevanceScore: 'desc' },
            take: 10,
            include: {
              university: {
                select: { id: true, name: true, slug: true, country: true, city: true },
              },
              program: {
                select: { id: true, name: true, field: true },
              },
            },
          },
        },
      })

      sessions = dbSessions.map(s => ({
        id: s.id,
        language: s.language,
        status: s.status,
        nationality: s.nationality,
        educationLevel: s.educationLevel,
        fieldOfInterest: s.fieldOfInterest,
        preferredCountries: s.preferredCountries ? JSON.parse(s.preferredCountries) : [],
        budgetUsd: s.budgetUsd,
        languagePref: s.languagePref,
        degreeLevel: s.degreeLevel,
        careerGoal: s.careerGoal,
        specialRequirements: s.specialRequirements,
        createdAt: s.createdAt,
        matches: s.matches.map(m => ({
          id: m.id,
          relevanceScore: m.relevanceScore,
          explanation: m.explanation,
          university: {
            id: m.university.id,
            name: m.university.name,
            slug: m.university.slug,
            country: m.university.country,
            city: m.university.city,
          },
          matchedProgram: m.program
            ? { id: m.program.id, name: m.program.name, field: m.program.field }
            : null,
        })),
      }))
    }
  } catch (err) {
    console.warn('[my-matches] DB unavailable:', err)
  }

  return <MyMatchesClient sessions={sessions.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }))} />
}
