/**
 * PATCH /api/me/profile
 *
 * Updates the authenticated user's profile. Used by:
 *   - /onboarding (after the wizard completes)
 *   - /account (Phase 2 — profile editing)
 *
 * Body (all fields optional, only provided fields are updated):
 *   {
 *     name?: string,
 *     country?: string,           // nationality (where the user is from)
 *     fieldOfInterest?: string,
 *     educationLevel?: string,    // high_school | bachelor | master | phd
 *     preferredCountries?: string[],  // array of country names
 *     budgetUsd?: number | null,
 *     locale?: string,            // "en" | "ar"
 *   }
 *
 * Returns the updated profile.
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  fieldOfInterest: z.string().trim().min(1).max(200).nullable().optional(),
  educationLevel: z
    .enum(['high_school', 'bachelor', 'master', 'phd'])
    .nullable()
    .optional(),
  preferredCountries: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  budgetUsd: z.number().int().min(0).max(1_000_000).nullable().optional(),
  locale: z.enum(['en', 'ar']).optional(),
  // ONB-03 extended profile fields
  gpa: z.number().min(0).max(5).nullable().optional(),
  englishLevel: z.string().trim().max(50).nullable().optional(),
  scholarshipNeed: z.boolean().optional(),
  intake: z.string().trim().max(50).nullable().optional(),
  // ONB-05 consent controls (processing is required — cannot be set to false via this endpoint)
  consentMarketing: z.boolean().optional(),
  consentLeadSharing: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = schema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json(
        { error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Invalid input' },
        { status: 400 }
      )
    }

    // Build the update object — only include fields that were provided.
    const update: Record<string, unknown> = {}
    if (validation.data.name !== undefined) update.name = validation.data.name
    if (validation.data.country !== undefined) update.country = validation.data.country
    if (validation.data.fieldOfInterest !== undefined) update.fieldOfInterest = validation.data.fieldOfInterest
    if (validation.data.educationLevel !== undefined) update.educationLevel = validation.data.educationLevel
    if (validation.data.preferredCountries !== undefined) {
      update.preferredCountries = JSON.stringify(validation.data.preferredCountries)
    }
    if (validation.data.budgetUsd !== undefined) update.budgetUsd = validation.data.budgetUsd
    if (validation.data.locale !== undefined) update.locale = validation.data.locale
    // ONB-03 extended fields
    if (validation.data.gpa !== undefined) update.gpa = validation.data.gpa
    if (validation.data.englishLevel !== undefined) update.englishLevel = validation.data.englishLevel
    if (validation.data.scholarshipNeed !== undefined) update.scholarshipNeed = validation.data.scholarshipNeed
    if (validation.data.intake !== undefined) update.intake = validation.data.intake
    // ONB-05 consent (processing is NOT settable — it's required and always true)
    if (validation.data.consentMarketing !== undefined) update.consentMarketing = validation.data.consentMarketing
    if (validation.data.consentLeadSharing !== undefined) update.consentLeadSharing = validation.data.consentLeadSharing

    // Find or create the profile row
    let profile = await db.user.findUnique({
      where: { supabaseId: user.id },
    })

    if (!profile) {
      // First-time profile (shouldn't happen here, but handle gracefully)
      profile = await db.user.create({
        data: {
          supabaseId: user.id,
          email: user.email ?? '',
          name: (user.user_metadata?.full_name as string) ?? (user.email?.split('@')[0] ?? 'Student'),
          country: (user.user_metadata?.country as string) ?? 'Jordan',
          ...update,
        },
      })
    } else {
      profile = await db.user.update({
        where: { supabaseId: user.id },
        data: update,
      })
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        country: profile.country,
        fieldOfInterest: profile.fieldOfInterest,
        educationLevel: profile.educationLevel,
        preferredCountries: profile.preferredCountries
          ? JSON.parse(profile.preferredCountries)
          : [],
        budgetUsd: profile.budgetUsd,
        role: profile.role,
        verificationStatus: profile.verificationStatus,
        locale: profile.locale,
      },
    })
  } catch (error) {
    console.error('[api/me/profile PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile. The database may be unavailable.' },
      { status: 500 }
    )
  }
}
