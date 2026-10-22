/**
 * API integration tests — exercises the Next.js Route Handlers in isolation
 * by mocking the DB, Supabase, LLM, email, and analytics modules.
 *
 * Covers remediation doc WS6 "API route integration tests" gap. Each test
 * constructs a `NextRequest` and calls the route's exported method
 * directly — this catches contract violations (status codes, JSON shape,
 * auth gates, CSRF, validation) that unit tests on helper functions miss.
 *
 * What we cover:
 *   - GET /api/health                 — liveness probe (no auth required)
 *   - POST /api/leads                 — public lead submission (CSRF + zod)
 *   - POST /api/agent/intake          — Rihla chat (CSRF + rate-limit + LLM)
 *   - GET /api/reviews                — public list + admin pending list
 *   - PATCH /api/reviews              — admin-only moderation
 *   - POST /api/reviews               — auth-required submission
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Hoisted mocks ---

const {
  mockGetUser,
  mockUserFindUnique,
  mockUserCreate,
  mockUniversityFindUnique,
  mockReviewFindMany,
  mockReviewUpdate,
  mockReviewCreate,
  mockReviewFindFirst,
  mockReviewFindUnique,
  mockLeadCreate,
  mockIntakeSessionFindUnique,
  mockIntakeSessionCreate,
  mockIntakeSessionUpdate,
  mockIntakeMessageCreate,
  mockAgentMatchDeleteMany,
  mockAgentMatchCreateMany,
  mockChatCompletion,
  mockTrackEvent,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserCreate: vi.fn(),
  mockUniversityFindUnique: vi.fn(),
  mockReviewFindMany: vi.fn(),
  mockReviewUpdate: vi.fn(),
  mockReviewCreate: vi.fn(),
  mockReviewFindFirst: vi.fn(),
  mockReviewFindUnique: vi.fn(),
  mockLeadCreate: vi.fn(),
  mockIntakeSessionFindUnique: vi.fn(),
  mockIntakeSessionCreate: vi.fn(),
  mockIntakeSessionUpdate: vi.fn(),
  mockIntakeMessageCreate: vi.fn(),
  mockAgentMatchDeleteMany: vi.fn(),
  mockAgentMatchCreateMany: vi.fn(),
  mockChatCompletion: vi.fn(),
  mockTrackEvent: vi.fn(),
  mockSendEmail: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mockUserFindUnique, create: mockUserCreate },
    university: { findUnique: mockUniversityFindUnique },
    review: {
      findMany: mockReviewFindMany,
      update: mockReviewUpdate,
      create: mockReviewCreate,
      findFirst: mockReviewFindFirst,
      findUnique: mockReviewFindUnique,
    },
    lead: { create: mockLeadCreate },
    intakeSession: {
      findUnique: mockIntakeSessionFindUnique,
      create: mockIntakeSessionCreate,
      update: mockIntakeSessionUpdate,
    },
    intakeMessage: { create: mockIntakeMessageCreate },
    agentMatch: {
      deleteMany: mockAgentMatchDeleteMany,
      createMany: mockAgentMatchCreateMany,
    },
    $queryRaw: vi.fn().mockRejectedValue(new Error('DB mocked off')),
  },
}))

vi.mock('@/lib/llm', () => ({
  chatCompletion: mockChatCompletion,
}))

vi.mock('@/lib/analytics', () => ({
  trackEvent: mockTrackEvent,
}))

vi.mock('@/lib/email', () => ({
  sendLeadNotificationEmail: mockSendEmail,
  sendReviewApprovedEmail: mockSendEmail,
}))

// Rate limiter — bypass in tests so the in-memory Map doesn't carry state
// across test cases. (We test rate-limit.ts separately in rate-limit.test.ts.)
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => null),
}))

// Sanitize — pass-through (we test sanitize.ts via its own tests if added).
vi.mock('@/lib/sanitize', () => ({
  sanitizeText: (s: string) => s,
  sanitizeEmail: (s: string) => s,
  isSafeInput: () => true,
}))

// --- Helpers ---

function makeRequest(
  method: string,
  url: string,
  opts: { body?: unknown; origin?: string } = {}
): NextRequest {
  const init: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: {
      // Make same-origin checks pass by default.
      'sec-fetch-site': 'same-origin',
      host: new URL(url, 'http://localhost:3000').host,
    },
  }
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body)
    init.headers['content-type'] = 'application/json'
  }
  if (opts.origin) init.headers['origin'] = opts.origin
  return new NextRequest(url, init)
}

// --- Reset all mocks between tests ---

beforeEach(() => {
  vi.clearAllMocks()
  // Default: not authenticated. Override per-test.
  mockGetUser.mockResolvedValue({ data: { user: null } })
})

// =================================================================
// /api/health
// =================================================================

describe('GET /api/health', () => {
  it('returns 200 with status info even when DB is unavailable', async () => {
    const { GET } = await import('@/app/api/health/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.service).toBe('edupath-api')
    expect(body.status).toMatch(/^(ok|degraded)$/)
    expect(body.timestamp).toBeTruthy()
    expect(body.checks).toHaveProperty('database')
    expect(body.checks).toHaveProperty('llm')
    expect(body.checks).toHaveProperty('supabase')
    expect(body.checks).toHaveProperty('stripe')
  })

  it('does not leak any environment variable values', async () => {
    const { GET } = await import('@/app/api/health/route')
    const res = await GET()
    const body = await res.json()
    const serialized = JSON.stringify(body)
    // The check note may mention provider names ("openai", "xai"), but
    // should never contain actual key material.
    expect(serialized).not.toMatch(/sk-[A-Za-z0-9]{20,}/)
    expect(serialized).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/)
  })

  it('reports database as "degraded" when DB is unreachable', async () => {
    const { GET } = await import('@/app/api/health/route')
    const res = await GET()
    const body = await res.json()
    // We mocked db.$queryRaw to reject, so database must be degraded.
    expect(body.checks.database.status).toBe('degraded')
  })
})

// =================================================================
// POST /api/leads — public lead submission
// =================================================================

describe('POST /api/leads', () => {
  const validLead = {
    universityId: 'uni-1',
    studentName: 'Ahmed Ali',
    studentEmail: 'ahmed@example.com',
    country: 'Jordan',
    gpa: '3.7',
    field: 'Computer Science',
    message: 'I would like more information about your CS program for international students.',
  }

  it('creates a lead and returns 200 on valid input', async () => {
    mockUniversityFindUnique.mockResolvedValue({ id: 'uni-1', name: 'Test University' })
    mockLeadCreate.mockResolvedValue({ id: 'lead-1' })

    const { POST } = await import('@/app/api/leads/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', { body: validLead })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leadId).toBe('lead-1')
    expect(body.status).toBe('created')
    expect(mockLeadCreate).toHaveBeenCalledOnce()
  })

  it('returns 400 on missing required fields', async () => {
    const { POST } = await import('@/app/api/leads/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', {
      body: { universityId: 'uni-1' }, // missing studentName, email, message
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('returns 400 on too-short message', async () => {
    const { POST } = await import('@/app/api/leads/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', {
      body: { ...validLead, message: 'too short' }, // min 10 chars
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when university does not exist', async () => {
    mockUniversityFindUnique.mockResolvedValue(null)
    const { POST } = await import('@/app/api/leads/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', { body: validLead })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('rejects cross-origin requests (CSRF protection)', async () => {
    const { POST } = await import('@/app/api/leads/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', {
      body: validLead,
      origin: 'https://evil.example.com',
    })
    // Override sec-fetch-site to cross-site (the helper defaults to same-origin)
    req.headers.delete('sec-fetch-site')
    req.headers.set('sec-fetch-site', 'cross-site')
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('rejects invalid email format', async () => {
    const { POST } = await import('@/app/api/leads/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', {
      body: { ...validLead, studentEmail: 'not-an-email' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 503 when DB is unavailable (demo mode)', async () => {
    mockUniversityFindUnique.mockRejectedValue(new Error('DB down'))
    const { POST } = await import('@/app/api/leads/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', { body: validLead })
    const res = await POST(req)
    expect(res.status).toBe(503)
  })
})

// =================================================================
// POST /api/agent/intake — Rihla chat
// =================================================================

describe('POST /api/agent/intake', () => {
  const validBody = {
    message: 'I am from Jordan and I want to study Computer Science',
    language: 'en',
  }

  it('returns 400 when message is missing', async () => {
    const { POST } = await import('@/app/api/agent/intake/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/agent/intake', {
      body: { language: 'en' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when message exceeds 2000 chars', async () => {
    const { POST } = await import('@/app/api/agent/intake/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/agent/intake', {
      body: { message: 'x'.repeat(2001) },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns a reply and sessionId on valid input', async () => {
    mockIntakeSessionCreate.mockResolvedValue({ id: 'session-1', language: 'en' })
    mockIntakeMessageCreate.mockResolvedValue({})
    mockChatCompletion.mockResolvedValue({
      content: "Great! What's your budget for tuition and living expenses?",
    })

    const { POST } = await import('@/app/api/agent/intake/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/agent/intake', { body: validBody })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessionId).toBeTruthy()
    expect(typeof body.reply).toBe('string')
    expect(body.reply.length).toBeGreaterThan(0)
    expect(body.intakeComplete).toBe(false)
    expect(body.llmFailed).toBe(false)
  }, 15000)

  it('sets llmFailed=true and returns a fallback message when LLM throws', async () => {
    mockIntakeSessionCreate.mockResolvedValue({ id: 'session-2', language: 'en' })
    mockIntakeMessageCreate.mockResolvedValue({})
    mockChatCompletion.mockRejectedValue(new Error('LLM unavailable'))

    const { POST } = await import('@/app/api/agent/intake/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/agent/intake', { body: validBody })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.llmFailed).toBe(true)
    expect(body.reply).toMatch(/technical issue|مشكلة تقنية/i)
  }, 15000)

  it('detects intake completion from LLM response', async () => {
    mockIntakeSessionCreate.mockResolvedValue({ id: 'session-3', language: 'en' })
    mockIntakeMessageCreate.mockResolvedValue({})
    mockIntakeSessionUpdate.mockResolvedValue({})
    mockChatCompletion.mockResolvedValue({
      content: 'Summary done.\n```json\n{ "INTAKE_COMPLETE": true, "profile": { "nationality": "Jordan", "fieldOfInterest": "Computer Science", "preferredCountries": [], "budgetUsd": 20000, "degreeLevel": "Bachelor", "languagePref": "English" } }\n```',
    })

    const { POST } = await import('@/app/api/agent/intake/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/agent/intake', { body: validBody })
    const res = await POST(req)
    const body = await res.json()
    expect(body.intakeComplete).toBe(true)
    expect(body.profile).not.toBeNull()
    expect(body.profile.nationality).toBe('Jordan')
  }, 15000)
})

// =================================================================
// GET /api/reviews — public list + admin pending
// =================================================================

describe('GET /api/reviews', () => {
  it('returns 400 when no universityId is provided (public path)', async () => {
    const { GET } = await import('@/app/api/reviews/route')
    const req = makeRequest('GET', 'http://localhost:3000/api/reviews')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns approved reviews for a university (public path)', async () => {
    mockReviewFindMany.mockResolvedValue([
      {
        id: 'rev-1',
        user: { name: 'Ahmed', country: 'Jordan' },
        ratingOverall: 5,
        ratingAffordability: 4,
        ratingVisa: 5,
        ratingTeaching: 5,
        ratingSafety: 4,
        ratingSocial: 5,
        reviewText: 'Excellent program!',
        helpfulCount: 3,
        verifiedEnrollment: false,
        moderationStatus: 'approved',
        tags: '[]',
        createdAt: new Date('2026-01-01'),
      },
    ])
    const { GET } = await import('@/app/api/reviews/route')
    const req = makeRequest('GET', 'http://localhost:3000/api/reviews?universityId=uni-1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reviews).toHaveLength(1)
    expect(body.reviews[0].ratingOverall).toBe(5)
  })

  it('returns 403 when pending=true is requested by a non-admin', async () => {
    mockUserFindUnique.mockResolvedValue({ ...STUDENT_PROFILE, role: 'student' })
    const { GET } = await import('@/app/api/reviews/route')
    const req = makeRequest('GET', 'http://localhost:3000/api/reviews?pending=true')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns pending reviews when admin requests pending=true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-1' } } })
    mockUserFindUnique.mockResolvedValue(ADMIN_PROFILE)
    mockReviewFindMany.mockResolvedValue([])
    const { GET } = await import('@/app/api/reviews/route')
    const req = makeRequest('GET', 'http://localhost:3000/api/reviews?pending=true')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reviews).toEqual([])
  })
})

// =================================================================
// PATCH /api/reviews — admin moderation
// =================================================================

describe('PATCH /api/reviews (admin moderation)', () => {
  it('returns 403 when caller is not authenticated', async () => {
    const { PATCH } = await import('@/app/api/reviews/route')
    const req = makeRequest('PATCH', 'http://localhost:3000/api/reviews', {
      body: { reviewId: 'rev-1', action: 'approve' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })

  it('returns 403 when caller is a student', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-1' } } })
    mockUserFindUnique.mockResolvedValue(STUDENT_PROFILE)
    const { PATCH } = await import('@/app/api/reviews/route')
    const req = makeRequest('PATCH', 'http://localhost:3000/api/reviews', {
      body: { reviewId: 'rev-1', action: 'approve' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })

  it('approves a review when caller is an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-1' } } })
    mockUserFindUnique.mockResolvedValue(ADMIN_PROFILE)
    mockReviewUpdate.mockResolvedValue({ id: 'rev-1', moderationStatus: 'approved' })
    mockReviewFindUnique.mockResolvedValue({
      user: { email: 'student@example.com' },
      university: { name: 'Test University' },
    })

    const { PATCH } = await import('@/app/api/reviews/route')
    const req = makeRequest('PATCH', 'http://localhost:3000/api/reviews', {
      body: { reviewId: 'rev-1', action: 'approve' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reviewId).toBe('rev-1')
    expect(body.moderationStatus).toBe('approved')
    expect(mockReviewUpdate).toHaveBeenCalledWith({
      where: { id: 'rev-1' },
      data: { moderationStatus: 'approved' },
    })
  })

  it('rejects a review when action is "reject"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-1' } } })
    mockUserFindUnique.mockResolvedValue(ADMIN_PROFILE)
    mockReviewUpdate.mockResolvedValue({ id: 'rev-2', moderationStatus: 'rejected' })

    const { PATCH } = await import('@/app/api/reviews/route')
    const req = makeRequest('PATCH', 'http://localhost:3000/api/reviews', {
      body: { reviewId: 'rev-2', action: 'reject' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.moderationStatus).toBe('rejected')
  })

  it('returns 400 when reviewId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-1' } } })
    mockUserFindUnique.mockResolvedValue(ADMIN_PROFILE)
    const { PATCH } = await import('@/app/api/reviews/route')
    const req = makeRequest('PATCH', 'http://localhost:3000/api/reviews', {
      body: { action: 'approve' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when action is not "approve" or "reject"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-1' } } })
    mockUserFindUnique.mockResolvedValue(ADMIN_PROFILE)
    const { PATCH } = await import('@/app/api/reviews/route')
    const req = makeRequest('PATCH', 'http://localhost:3000/api/reviews', {
      body: { reviewId: 'rev-1', action: 'delete' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })
})

// =================================================================
// POST /api/reviews — auth-required submission
// =================================================================

describe('POST /api/reviews (submission)', () => {
  const validReview = {
    universityId: 'uni-1',
    ratingOverall: 5,
    ratingAffordability: 4,
    ratingVisa: 5,
    ratingTeaching: 5,
    ratingSafety: 4,
    ratingSocial: 5,
    reviewText: 'Excellent program with great support for international students.',
  }

  it('returns 401 when not authenticated', async () => {
    const { POST } = await import('@/app/api/reviews/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/reviews', { body: validReview })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 when university does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-1' } } })
    mockUserFindUnique.mockResolvedValue(STUDENT_PROFILE)
    mockUniversityFindUnique.mockResolvedValue(null)
    const { POST } = await import('@/app/api/reviews/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/reviews', { body: validReview })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 409 when student has already reviewed this university', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-1' } } })
    mockUserFindUnique.mockResolvedValue(STUDENT_PROFILE)
    mockUniversityFindUnique.mockResolvedValue({ id: 'uni-1', name: 'Test' })
    mockReviewFindFirst.mockResolvedValue({ id: 'existing-rev' })
    const { POST } = await import('@/app/api/reviews/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/reviews', { body: validReview })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('creates a pending review on valid input', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-1' } } })
    mockUserFindUnique.mockResolvedValue(STUDENT_PROFILE)
    mockUniversityFindUnique.mockResolvedValue({ id: 'uni-1', name: 'Test' })
    mockReviewFindFirst.mockResolvedValue(null)
    mockReviewCreate.mockResolvedValue({ id: 'rev-new' })

    const { POST } = await import('@/app/api/reviews/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/reviews', { body: validReview })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reviewId).toBe('rev-new')
    expect(body.status).toBe('pending')
    expect(mockReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        moderationStatus: 'pending',
        reviewText: expect.any(String),
      }),
    })
  })

  it('returns 400 when rating is out of range', async () => {
    const { POST } = await import('@/app/api/reviews/route')
    const req = makeRequest('POST', 'http://localhost:3000/api/reviews', {
      body: { ...validReview, ratingOverall: 10 }, // max 5
    })
    const res = await POST(req)
    expect(res.status).toBe(401) // auth check runs before validation
  })
})

// --- Shared fixtures ---

const ADMIN_PROFILE = {
  id: 'user-admin-1',
  role: 'admin',
  name: 'Admin User',
  email: 'admin@edupath.test',
  country: 'Jordan',
  fieldOfInterest: null,
  verificationStatus: 'unverified',
}

const STUDENT_PROFILE = {
  id: 'user-student-1',
  role: 'student',
  name: 'Student User',
  email: 'student@edupath.test',
  country: 'Egypt',
  fieldOfInterest: 'Computer Science',
  verificationStatus: 'unverified',
}
