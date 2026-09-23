/**
 * Rihla agent — university matching and ranking pipeline.
 *
 * 3-step algorithm:
 *   1. Structured filter (hard constraints: country, budget, language, degree)
 *   2. Heuristic scoring (budget fit, field match, special requirements)
 *   3. LLM-generated personalized explanations (graceful degradation)
 */

import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import ZAI from 'z-ai-web-dev-sdk'
import type { IntakeProfile } from './rihla'

type Program = {
  id: string
  name: string
  degreeLevel: string
  field: string
  durationMonths: number
  language: string
  tuitionUsd: number
  deadline: string | null
  entryReqs: string | null
}

type University = {
  id: string
  slug: string
  name: string
  country: string
  city: string
  website: string
  tuitionUsd: number
  livingCostUsd: number
  intlStudentPct: number
  acceptanceRate: number | null
  logoUrl: string | null
  descriptionEn: string | null
  programs: Program[]
  scholarships: Array<{ id: string; name: string; amountUsd: number; amountType: string }>
  hasHalalFood?: boolean | null
  hasPrayerFacilities?: boolean | null
  hasGenderSegregatedHousing?: boolean | null
}

export type AgentMatchResult = University & {
  relevanceScore: number
  explanation: string
  matchedProgram?: Program
}

/**
 * Find personalized university matches for a student profile.
 */
export async function findMatches(profile: IntakeProfile): Promise<AgentMatchResult[]> {
  // Step 1: Get candidates (from DB, fall back to static data)
  const candidates = await getCandidates(profile)

  // Step 2: Score and rank
  const ranked = candidates
    .map(uni => ({
      ...uni,
      relevanceScore: scoreUniversity(uni, profile),
      matchedProgram: findBestProgram(uni, profile),
    }))
    .filter(uni => uni.relevanceScore > 0) // Remove zero-score matches
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10)

  // Step 3: Generate LLM explanations (with graceful degradation)
  const withExplanations = await Promise.all(
    ranked.map(async uni => ({
      ...uni,
      explanation: await generateExplanation(uni, profile),
    }))
  )

  return withExplanations
}

/**
 * Fetch candidate universities from DB (or static fallback).
 */
async function getCandidates(profile: IntakeProfile): Promise<University[]> {
  const countries = profile.preferredCountries || []
  const budget = profile.budgetUsd || 999999
  const langPref = profile.languagePref
  const degreeLevel = profile.degreeLevel?.toLowerCase()

  try {
    const where: Record<string, unknown> = {}
    if (countries.length > 0) where.country = { in: countries }
    where.tuitionUsd = { lte: budget }
    where.pendingReview = false

    const unis = await db.university.findMany({
      where,
      include: {
        programs: {
          where: degreeLevel ? { degreeLevel } : undefined,
        },
        scholarships: { select: { id: true, name: true, amountUsd: true, amountType: true } },
      },
      orderBy: { tuitionUsd: 'asc' },
      take: 50,
    })

    // Filter by language preference if set
    let filtered = unis
    if (langPref) {
      filtered = unis.filter(u =>
        u.programs.some(p => p.language.toLowerCase().includes(langPref.toLowerCase()))
      )
    }

    return filtered.map(u => ({
      id: u.id,
      slug: u.slug,
      name: u.name,
      country: u.country,
      city: u.city,
      website: u.website,
      tuitionUsd: u.tuitionUsd,
      livingCostUsd: u.livingCostUsd,
      intlStudentPct: u.intlStudentPct,
      acceptanceRate: u.acceptanceRate,
      logoUrl: u.logoUrl,
      descriptionEn: u.descriptionEn,
      programs: u.programs.map(p => ({
        id: p.id, name: p.name, degreeLevel: p.degreeLevel, field: p.field,
        durationMonths: p.durationMonths, language: p.language,
        tuitionUsd: p.tuitionUsd, deadline: p.deadline, entryReqs: p.entryReqs,
      })),
      scholarships: u.scholarships,
    }))
  } catch {
    // DB unavailable — use static data
    let staticUnis = staticUniversities as unknown as University[]

    // Apply country filter
    if (countries.length > 0) {
      staticUnis = staticUnis.filter(u => countries.includes(u.country))
    }

    // Apply budget filter
    staticUnis = staticUnis.filter(u => u.tuitionUsd <= budget)

    // Apply degree filter
    if (degreeLevel) {
      staticUnis = staticUnis.filter(u =>
        u.programs.some(p => p.degreeLevel.toLowerCase() === degreeLevel)
      )
    }

    // Apply language filter
    if (langPref) {
      staticUnis = staticUnis.filter(u =>
        u.programs.some(p => p.language.toLowerCase().includes(langPref.toLowerCase()))
      )
    }

    return staticUnis.slice(0, 50)
  }
}

/**
 * Score a university against the student profile (0-100).
 */
function scoreUniversity(uni: University, profile: IntakeProfile): number {
  let score = 0

  // Budget fit (40 pts max) — closer to budget = higher score
  if (uni.tuitionUsd && profile.budgetUsd) {
    const ratio = uni.tuitionUsd / profile.budgetUsd
    if (ratio <= 1) {
      // Within budget — score proportional to how much budget remains
      score += Math.max(10, 40 * (1 - ratio * 0.5))
    } else if (ratio <= 1.2) {
      // Slightly over budget — partial score
      score += 15
    }
  }

  // Field match (30 pts)
  if (profile.fieldOfInterest) {
    const field = profile.fieldOfInterest.toLowerCase()
    if (uni.programs.some(p => p.field.toLowerCase().includes(field) || field.includes(p.field.toLowerCase()))) {
      score += 30
    }
  }

  // Country preference (20 pts) — already filtered, give base score
  if (profile.preferredCountries && profile.preferredCountries.length > 0) {
    score += 20
  } else {
    // "Anywhere" — give smaller bonus
    score += 10
  }

  // Language match (10 pts)
  if (profile.languagePref) {
    const lang = profile.languagePref.toLowerCase()
    if (uni.programs.some(p => p.language.toLowerCase().includes(lang))) {
      score += 10
    }
  }

  // Special requirements (bonus, up to 10 pts)
  if (profile.specialRequirements) {
    const reqs = profile.specialRequirements.toLowerCase()
    if (reqs.includes('halal') && uni.hasHalalFood) score += 4
    if (reqs.includes('prayer') && uni.hasPrayerFacilities) score += 3
    if (reqs.includes('gender') && uni.hasGenderSegregatedHousing) score += 3
  }

  return Math.min(score, 100)
}

/**
 * Find the best matching program for the student's field of interest.
 */
function findBestProgram(uni: University, profile: IntakeProfile): Program | undefined {
  if (!profile.fieldOfInterest) return uni.programs[0]

  const field = profile.fieldOfInterest.toLowerCase()
  return (
    uni.programs.find(p => p.field.toLowerCase() === field) ||
    uni.programs.find(p => p.field.toLowerCase().includes(field)) ||
    uni.programs.find(p => field.includes(p.field.toLowerCase())) ||
    uni.programs[0]
  )
}

/**
 * Generate a personalized "Why this matches you" explanation via LLM.
 * Falls back to a template if the LLM call fails.
 */
async function generateExplanation(uni: University, profile: IntakeProfile): Promise<string> {
  const lang = profile.language === 'ar' ? 'Arabic' : 'English'
  const langInstruction = profile.language === 'ar'
    ? 'بالعربية'
    : 'in English'

  const studentSummary = [
    profile.fieldOfInterest && `field: ${profile.fieldOfInterest}`,
    profile.budgetUsd && `budget: $${profile.budgetUsd}/yr`,
    profile.degreeLevel && `degree: ${profile.degreeLevel}`,
    profile.languagePref && `language: ${profile.languagePref}`,
    profile.careerGoal && `career goal: ${profile.careerGoal}`,
    profile.specialRequirements && `special needs: ${profile.specialRequirements}`,
  ].filter(Boolean).join(', ')

  const programInfo = uni.programs[0]
    ? `Programs in ${uni.programs[0].field}. `
    : ''

  const prompt = `Student wants: ${studentSummary}.
University: ${uni.name} in ${uni.city}, ${uni.country}.
Tuition: $${uni.tuitionUsd}/year. Living cost: $${uni.livingCostUsd}/year.
${programInfo}International students: ${uni.intlStudentPct}%.

Write EXACTLY 2 sentences ${langInstruction} explaining why this university is a great match for this student. Be specific about budget, location, or program fit. Be encouraging. Do not use markdown.`

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: `You are a helpful university advisor. Write in ${lang}.` },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    })
    const explanation = completion.choices[0]?.message?.content?.trim()
    if (explanation) return explanation
  } catch (err) {
    console.error('[matcher] LLM explanation failed:', err)
  }

  // Graceful degradation — template-based explanation
  if (profile.language === 'ar') {
    return `جامعة ${uni.name} في ${uni.city}، ${uni.country} تتناسب مع ميزانيتك (${uni.tuitionUsd}$/سنة) وتقدم برامج في ${uni.programs[0]?.field || 'مجالك'}. نسبة الطلاب الدوليين ${uni.intlStudentPct}% مما يوفر بيئة متنوعة.`
  }
  return `${uni.name} in ${uni.city}, ${uni.country} fits your budget ($${uni.tuitionUsd}/yr) and offers programs in ${uni.programs[0]?.field || 'your field'}. With ${uni.intlStudentPct}% international students, you'll join a diverse community.`
}
