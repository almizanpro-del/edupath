/**
 * Input validation schemas for API route handlers.
 *
 * Uses zod (already a project dependency) to enforce type safety at the
 * request boundary. Each schema validates the shape of an incoming JSON
 * body before the route handler touches it, preventing type confusion,
 * silent data corruption, and injection via unexpected fields.
 */
import { z } from 'zod'

// ---- Reusable primitives ----

export const nonEmptyString = z.string().trim().min(1).max(10_000)
export const emailString = z.string().trim().toLowerCase().email().max(320)
export const urlString = z
  .string()
  .url()
  .max(2048)
  .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
    message: 'URL must use http or https protocol',
  })
  .refine((url) => !url.startsWith('javascript:'), {
    message: 'javascript: URLs are not allowed',
  })

// Country code (ISO 3166-1 alpha-2 lowercase) — we accept any 2-letter
// code to stay forward-compatible with new countries being added.
export const countryCode = z
  .string()
  .trim()
  .length(2)
  .regex(/^[a-z]{2}$/i, 'Must be a 2-letter ISO country code')

// GPA — accept 0.0 to 5.0 (some systems use 5.0 scale)
export const gpa = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
  .refine((n) => !isNaN(n) && n >= 0 && n <= 5, 'GPA must be between 0 and 5')
  .optional()
  .nullable()

// ---- Route-specific schemas ----

export const leadSchema = z.object({
  universityId: nonEmptyString,
  studentName: nonEmptyString.max(200),
  studentEmail: emailString,
  country: nonEmptyString.max(100).optional().nullable(),
  gpa,
  field: nonEmptyString.max(200).optional().nullable(),
  message: nonEmptyString.min(10).max(2000),
})

export const eventSchema = z.object({
  eventType: z.enum([
    'university_view',
    'search',
    'compare',
    'save',
    'unsave',
    'essay_review',
    'scholarship_match',
    'transfer_view',
    'contact_form',
    'contact_open',
    'contact_submit',
    'university_claim',
    'filter_apply',
    'share',
    'locale_change',
    'google_signin',
    'email_signin',
    'signup',
  ]),
  universityId: nonEmptyString.optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const reviewSchema = z.object({
  universityId: nonEmptyString,
  ratingOverall: z.number().int().min(1).max(5),
  ratingAffordability: z.number().int().min(1).max(5),
  ratingVisa: z.number().int().min(1).max(5),
  ratingTeaching: z.number().int().min(1).max(5),
  ratingSafety: z.number().int().min(1).max(5),
  ratingSocial: z.number().int().min(1).max(5),
  reviewText: nonEmptyString.min(20).max(5000),
  tags: z.array(nonEmptyString.max(50)).max(10).optional().default([]),
})

export const reviewPatchSchema = z.object({
  reviewId: nonEmptyString,
  moderationStatus: z.enum(['approved', 'rejected', 'pending']),
})

export const claimSchema = z.object({
  universityId: nonEmptyString,
  claimantName: nonEmptyString.max(200),
  claimantEmail: emailString,
  officialName: nonEmptyString.max(200),
  officialEmail: emailString,
  officialTitle: nonEmptyString.max(200).optional().nullable(),
  proofUrl: urlString.optional().nullable(),
})

export const claimPatchSchema = z.object({
  claimEventId: nonEmptyString,
  status: z.enum(['approved', 'rejected']),
})

export const savedListSchema = z.object({
  universityId: nonEmptyString,
})

export const scholarshipMatchSchema = z.object({
  gpa: z.union([z.string(), z.number()]).transform((v) =>
    typeof v === 'string' ? parseFloat(v) : v
  ).refine((n) => !isNaN(n) && n >= 0 && n <= 5, 'GPA must be between 0 and 5'),
  field: nonEmptyString.max(200),
  country: nonEmptyString.max(100).optional().nullable(),
  degreeLevel: z.enum(['bachelor', 'master', 'phd']).optional().nullable(),
})

export const essayReviewSchema = z.object({
  essayText: nonEmptyString.min(50).max(10_000),
  programName: nonEmptyString.max(300).optional().nullable(),
  country: nonEmptyString.max(100).optional().nullable(),
})

export const adminUniversityCreateSchema = z.object({
  name: nonEmptyString.max(300),
  slug: nonEmptyString.max(300).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, hyphens only'),
  country: nonEmptyString.max(100),
  city: nonEmptyString.max(100),
  website: urlString,
  tuitionUsd: z.number().min(0).max(1_000_000),
  livingCostUsd: z.number().min(0).max(1_000_000),
  intlStudentPct: z.number().min(0).max(100),
  acceptanceRate: z.number().min(0).max(100).optional().nullable(),
  currency: nonEmptyString.max(10).optional().default('USD'),
  descriptionEn: nonEmptyString.max(10_000),
  descriptionAr: nonEmptyString.max(10_000).optional().nullable(),
})

export const adminUniversityPatchSchema = z.object({
  name: nonEmptyString.max(300).optional(),
  slug: nonEmptyString.max(300).regex(/^[a-z0-9-]+$/).optional(),
  country: nonEmptyString.max(100).optional(),
  city: nonEmptyString.max(100).optional(),
  website: urlString.optional(),
  tuitionUsd: z.number().min(0).max(1_000_000).optional(),
  livingCostUsd: z.number().min(0).max(1_000_000).optional(),
  intlStudentPct: z.number().min(0).max(100).optional(),
  acceptanceRate: z.number().min(0).max(100).nullable().optional(),
  currency: nonEmptyString.max(10).optional(),
  descriptionEn: nonEmptyString.max(10_000).optional(),
  descriptionAr: nonEmptyString.max(10_000).nullable().optional(),
})

// Stripe checkout — tierId is validated against TIERS in the route itself
export const stripeCheckoutSchema = z.object({
  tierId: nonEmptyString.max(100),
})

export const transferPathwaySchema = z.object({
  from: nonEmptyString.max(200),
  to: nonEmptyString.max(200),
})

// ---- Helper to parse + format errors ----

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): ValidationResult<T> {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  // Format zod errors into a readable string
  const firstError = result.error.issues[0]
  const message = firstError
    ? `${firstError.path.join('.') || 'body'}: ${firstError.message}`
    : 'Invalid request body'
  return { success: false, error: message }
}
