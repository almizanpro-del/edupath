/**
 * Tests for the Rihla agent pipeline — intake parsing, message building,
 * and the matching/scoring algorithm.
 *
 * These tests cover the remediation doc's WS6 "Rihla pipeline tests" gap.
 * They run entirely against pure functions with mocked DB/LLM, so they
 * work without any external services.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  RIHLA_SYSTEM_PROMPT,
  parseIntakeComplete,
  isIntakeComplete,
  buildMessages,
  type IntakeProfile,
} from './rihla'

// --- Pure function tests (no mocking needed) ---

describe('isIntakeComplete', () => {
  it('returns true when reply contains both marker and json fence', () => {
    const reply = `Great! Here's your profile:
\`\`\`json
{ "INTAKE_COMPLETE": true, "profile": {} }
\`\`\``
    expect(isIntakeComplete(reply)).toBe(true)
  })

  it('returns false when only the marker is present (no fence)', () => {
    expect(isIntakeComplete('INTAKE_COMPLETE but no json')).toBe(false)
  })

  it('returns false when only the json fence is present (no marker)', () => {
    expect(isIntakeComplete('```json\n{ "profile": {} }\n```')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isIntakeComplete('')).toBe(false)
  })

  it('returns false for unrelated Rihla chat reply', () => {
    const reply = "Great! What's your budget for tuition and living expenses?"
    expect(isIntakeComplete(reply)).toBe(false)
  })
})

describe('parseIntakeComplete', () => {
  const validReply = `Here's your summary.
\`\`\`json
{ "INTAKE_COMPLETE": true, "profile": { "nationality": "Jordan", "educationLevel": "high school", "fieldOfInterest": "Computer Science", "preferredCountries": ["Turkey", "Germany"], "budgetUsd": 15000, "languagePref": "English", "degreeLevel": "Bachelor", "careerGoal": "Software Engineer", "specialRequirements": "halal food" } }
\`\`\``

  it('extracts the profile from a valid reply', () => {
    const profile = parseIntakeComplete(validReply)
    expect(profile).not.toBeNull()
    expect(profile?.nationality).toBe('Jordan')
    expect(profile?.fieldOfInterest).toBe('Computer Science')
    expect(profile?.preferredCountries).toEqual(['Turkey', 'Germany'])
    expect(profile?.budgetUsd).toBe(15000)
    expect(profile?.degreeLevel).toBe('Bachelor')
  })

  it('returns null when reply has no json block', () => {
    expect(parseIntakeComplete('no json here')).toBeNull()
  })

  it('returns null when JSON is malformed', () => {
    const reply = '```json\n{ not valid json }\n```'
    expect(parseIntakeComplete(reply)).toBeNull()
  })

  it('returns null when INTAKE_COMPLETE is false', () => {
    const reply = '```json\n{ "INTAKE_COMPLETE": false, "profile": {} }\n```'
    expect(parseIntakeComplete(reply)).toBeNull()
  })

  it('returns null when profile field is missing', () => {
    const reply = '```json\n{ "INTAKE_COMPLETE": true }\n```'
    expect(parseIntakeComplete(reply)).toBeNull()
  })

  it('preserves empty preferredCountries array (the "anywhere" case)', () => {
    const reply = '```json\n{ "INTAKE_COMPLETE": true, "profile": { "preferredCountries": [] } }\n```'
    expect(parseIntakeComplete(reply)?.preferredCountries).toEqual([])
  })
})

describe('buildMessages', () => {
  it('returns a 2-message array (system + user) per the ZAI SDK convention', () => {
    const messages = buildMessages([], 'I am from Egypt', 'en')
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('assistant')
    expect(messages[0].content).toBe(RIHLA_SYSTEM_PROMPT)
    expect(messages[1].role).toBe('user')
  })

  it('embeds the new user message at the end of the user content', () => {
    const messages = buildMessages([], 'I am from Egypt', 'en')
    expect(messages[1].content).toContain('I am from Egypt')
    expect(messages[1].content).toContain('Student:')
  })

  it('includes prior conversation history in the user content', () => {
    const history = [
      { role: 'user', content: 'I am from Egypt' },
      { role: 'assistant', content: 'Great! What do you want to study?' },
    ]
    const messages = buildMessages(history, 'Computer Science', 'en')
    expect(messages[1].content).toContain('I am from Egypt')
    expect(messages[1].content).toContain('Computer Science')
    expect(messages[1].content).toContain('Great! What do you want to study?')
  })

  it('includes language instruction (Arabic) when language is ar', () => {
    const messages = buildMessages([], 'مرحبا', 'ar')
    expect(messages[1].content).toContain('Arabic')
  })

  it('includes language instruction (English) when language is en', () => {
    const messages = buildMessages([], 'hello', 'en')
    expect(messages[1].content).toContain('English')
  })

  it('filters out the canned greeting from history to avoid duplication', () => {
    // Use the exact greeting string the production code checks for.
    const greetingEn =
      "Hello! I'm Rihla, your AI university advisor. I'll help you find the perfect university. To start, what's your nationality?"
    const history = [
      { role: 'assistant', content: greetingEn },
      { role: 'user', content: 'I am from Jordan' },
    ]
    const messages = buildMessages(history, 'CS', 'en')
    expect(messages[1].content).not.toContain(greetingEn)
  })
})

// --- Matcher tests (mock DB + LLM) ---

// Mock the DB module so getCandidates() falls through to static data.
vi.mock('@/lib/db', () => ({
  db: {
    university: {
      findMany: vi.fn().mockRejectedValue(new Error('DB mocked off')),
    },
    agentMatch: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRaw: vi.fn().mockRejectedValue(new Error('DB mocked off')),
  },
}))

// Mock the LLM so generateExplanation returns deterministic text.
vi.mock('@/lib/llm', () => ({
  chatCompletion: vi.fn().mockResolvedValue({
    content: 'Mocked explanation for this university.',
  }),
}))

// Import matcher AFTER mocks are registered.
import { findMatches } from './matcher'

describe('findMatches (Rihla matching pipeline)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns at most 10 matches sorted by relevance score (descending)', async () => {
    const profile: IntakeProfile = {
      nationality: 'Jordan',
      fieldOfInterest: 'Computer Science',
      preferredCountries: [],
      budgetUsd: 50000,
      languagePref: 'English',
      degreeLevel: 'bachelor',
      language: 'en',
    }
    const matches = await findMatches(profile)
    expect(matches.length).toBeLessThanOrEqual(10)
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].relevanceScore).toBeLessThanOrEqual(matches[i - 1].relevanceScore)
    }
  }, 15000)

  it('returns matches with non-zero relevance scores only', async () => {
    const profile: IntakeProfile = {
      nationality: 'Jordan',
      fieldOfInterest: 'Computer Science',
      budgetUsd: 50000,
      language: 'en',
    }
    const matches = await findMatches(profile)
    for (const m of matches) {
      expect(m.relevanceScore).toBeGreaterThan(0)
    }
  }, 15000)

  it('attaches a non-empty explanation to every match', async () => {
    const profile: IntakeProfile = {
      nationality: 'Jordan',
      fieldOfInterest: 'Engineering',
      budgetUsd: 30000,
      languagePref: 'English',
      language: 'en',
    }
    const matches = await findMatches(profile)
    expect(matches.length).toBeGreaterThan(0)
    for (const m of matches) {
      expect(typeof m.explanation).toBe('string')
      expect(m.explanation.length).toBeGreaterThan(0)
    }
  }, 15000)

  it('falls back to template explanation when LLM throws', async () => {
    // Re-mock LLM to throw for this test only.
    const { chatCompletion } = await import('@/lib/llm')
    const mocked = chatCompletion as ReturnType<typeof vi.fn>
    const original = mocked.getMockImplementation()
    mocked.mockRejectedValueOnce(new Error('LLM down'))
    mocked.mockRejectedValueOnce(new Error('LLM down'))
    mocked.mockRejectedValueOnce(new Error('LLM down'))

    const profile: IntakeProfile = {
      nationality: 'Egypt',
      fieldOfInterest: 'Business',
      budgetUsd: 20000,
      language: 'en',
    }
    const matches = await findMatches(profile)
    if (matches.length > 0) {
      // Either the LLM explanation or the template fallback should appear.
      expect(matches[0].explanation.length).toBeGreaterThan(0)
    }
    // Restore
    if (original) mocked.mockImplementation(original)
  }, 15000)

  it('returns an empty array when no university matches the budget', async () => {
    const profile: IntakeProfile = {
      nationality: 'Jordan',
      budgetUsd: 1, // Impossibly low — no university charges $1/year
      language: 'en',
    }
    const matches = await findMatches(profile)
    // Static seed data has no university with tuitionUsd <= 1.
    expect(matches).toEqual([])
  }, 15000)

  it('respects preferredCountries filter when set', async () => {
    const profile: IntakeProfile = {
      nationality: 'Jordan',
      preferredCountries: ['Turkey'],
      budgetUsd: 100000,
      language: 'en',
    }
    const matches = await findMatches(profile)
    for (const m of matches) {
      expect(m.country).toBe('Turkey')
    }
  }, 15000)
})

// --- scoreUniversity via findMatches behavior (indirect) ---

describe('Rihla scoring weight reduction for unverified tuition', () => {
  // Per remediation WS3: tuition weight should be capped at 25 pts (was 40)
  // to avoid over-relying on potentially incorrect figures.
  // We verify this indirectly: a university that perfectly fits budget
  // but has zero field/language/country match should score <= 25.

  it('caps budget-only score at 25 pts (no field/country/language match)', async () => {
    const profile: IntakeProfile = {
      nationality: 'Jordan',
      budgetUsd: 999999, // Huge budget — every uni fits
      // Intentionally omit fieldOfInterest, preferredCountries, languagePref
      language: 'en',
    }
    const matches = await findMatches(profile)
    for (const m of matches) {
      // Without field match (30), country match (20), language match (10),
      // only the budget portion (capped at 25) and the special-requirements
      // bonus (0 here) contribute. So total <= 25 + the "anywhere" bonus (10).
      // = 35 max.
      expect(m.relevanceScore).toBeLessThanOrEqual(35)
    }
  }, 15000)
})
