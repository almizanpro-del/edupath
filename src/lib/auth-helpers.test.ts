/**
 * Tests for the shared auth helpers (requireAdmin, requireRecruiterOrAdmin,
 * getOrCreateProfile).
 *
 * Covers remediation doc WS6 "Auth/authorization tests" gap. These helpers
 * are the single source of truth for admin authorization across all admin
 * API routes — a bug here would either let unauthorized users in or lock
 * admins out.
 *
 * We mock Supabase and Prisma so the tests run without external services.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
// vi.mock factories are hoisted above imports, so any variable they
// reference must be declared via vi.hoisted() to be in scope at hoist time.

const { mockGetUser, mockUserFindUnique, mockUserCreate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserCreate: vi.fn(),
}))

const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
  },
}))

// --- Import AFTER mocks ---

import {
  getOrCreateProfile,
  requireAdmin,
  requireRecruiterOrAdmin,
} from './auth-helpers'

// --- Test fixtures ---

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

const RECRUITER_PROFILE = {
  id: 'user-recruiter-1',
  role: 'recruiter',
  name: 'Recruiter User',
  email: 'recruiter@edupath.test',
  country: 'Turkey',
  fieldOfInterest: 'uni-1',
  verificationStatus: 'unverified',
}

const SUPABASE_USER = {
  id: 'supabase-id-1',
  email: 'admin@edupath.test',
  user_metadata: { full_name: 'Admin User', country: 'Jordan' },
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getOrCreateProfile', () => {
  it('returns null when no Supabase user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const profile = await getOrCreateProfile()
    expect(profile).toBeNull()
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it('returns the existing profile when the user is found in the DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue(ADMIN_PROFILE)
    const profile = await getOrCreateProfile()
    expect(profile).toEqual(ADMIN_PROFILE)
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { supabaseId: 'supabase-id-1' },
      select: expect.objectContaining({
        id: true,
        role: true,
        name: true,
        email: true,
      }),
    })
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('creates a new profile when the user is not found in the DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue(null)
    mockUserCreate.mockResolvedValue(STUDENT_PROFILE)
    const profile = await getOrCreateProfile()
    expect(profile).toEqual(STUDENT_PROFILE)
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supabaseId: 'supabase-id-1',
        email: 'admin@edupath.test',
        name: 'Admin User',
        country: 'Jordan',
        role: 'student',
      }),
      select: expect.any(Object),
    })
  })

  it('falls back to email-username when full_name is missing', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'supabase-id-2',
          email: 'jordan.student@example.com',
          user_metadata: {},
        },
      },
    })
    mockUserFindUnique.mockResolvedValue(null)
    mockUserCreate.mockResolvedValue({ ...STUDENT_PROFILE, name: 'jordan.student' })
    await getOrCreateProfile()
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'jordan.student',
        country: 'Jordan', // default
      }),
      select: expect.any(Object),
    })
  })

  it('falls back to "Student" when email is also missing', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'supabase-id-3',
          email: null,
          user_metadata: {},
        },
      },
    })
    mockUserFindUnique.mockResolvedValue(null)
    mockUserCreate.mockResolvedValue({ ...STUDENT_PROFILE, name: 'Student' })
    await getOrCreateProfile()
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Student',
      }),
      select: expect.any(Object),
    })
  })
})

describe('requireAdmin', () => {
  it('returns the profile when the user is an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue(ADMIN_PROFILE)
    const profile = await requireAdmin()
    expect(profile).toEqual(ADMIN_PROFILE)
  })

  it('returns null when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const profile = await requireAdmin()
    expect(profile).toBeNull()
  })

  it('returns null when the user is a student', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue(STUDENT_PROFILE)
    const profile = await requireAdmin()
    expect(profile).toBeNull()
  })

  it('returns null when the user is a recruiter (admin-only)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue(RECRUITER_PROFILE)
    const profile = await requireAdmin()
    expect(profile).toBeNull()
  })

  it('returns null when the role is an unknown string', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue({ ...STUDENT_PROFILE, role: 'superuser' })
    const profile = await requireAdmin()
    expect(profile).toBeNull()
  })
})

describe('requireRecruiterOrAdmin', () => {
  it('returns the profile when the user is an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue(ADMIN_PROFILE)
    const profile = await requireRecruiterOrAdmin()
    expect(profile).toEqual(ADMIN_PROFILE)
  })

  it('returns the profile when the user is a recruiter', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue(RECRUITER_PROFILE)
    const profile = await requireRecruiterOrAdmin()
    expect(profile).toEqual(RECRUITER_PROFILE)
  })

  it('returns null when the user is a student', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue(STUDENT_PROFILE)
    const profile = await requireRecruiterOrAdmin()
    expect(profile).toBeNull()
  })

  it('returns null when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const profile = await requireRecruiterOrAdmin()
    expect(profile).toBeNull()
  })

  it('returns null when the role is an unknown string', async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } })
    mockUserFindUnique.mockResolvedValue({ ...STUDENT_PROFILE, role: 'moderator' })
    const profile = await requireRecruiterOrAdmin()
    expect(profile).toBeNull()
  })
})
