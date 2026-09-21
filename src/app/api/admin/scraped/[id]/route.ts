/**
 * Admin API for reviewing individual scraped universities.
 *
 * PATCH /api/admin/scraped/[id]  — approve or reject a scraped record
 *   body: { action: 'approve' | 'reject' }
 *
 * When approved:
 *   - Creates a new University record (or updates if slug exists)
 *   - Marks the ScrapedUniversity as 'approved'
 *   - Sets reviewedAt + reviewedBy
 *
 * When rejected:
 *   - Marks the ScrapedUniversity as 'rejected'
 *   - Does NOT create a University record
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'
import { validateBody } from '@/lib/validation'
import { z } from 'zod'

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await db.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      id: true, role: true, name: true, email: true,
      country: true, fieldOfInterest: true, verificationStatus: true,
    },
  })
  return profile?.role === 'admin' ? profile : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  const profile = await requireAdmin()
  if (!profile) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const validation = validateBody(reviewSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { action } = validation.data

    const scraped = await db.scrapedUniversity.findUnique({ where: { id } })
    if (!scraped) {
      return NextResponse.json({ error: 'Scraped university not found' }, { status: 404 })
    }

    if (action === 'approve') {
      // Check if a university with this slug already exists
      const existingUni = await db.university.findUnique({
        where: { slug: scraped.slug },
      })

      if (existingUni) {
        // Update existing university with scraped data
        const updated = await db.university.update({
          where: { id: existingUni.id },
          data: {
            name: scraped.name,
            country: scraped.country,
            city: scraped.city,
            website: scraped.website || existingUni.website,
            tuitionUsd: scraped.tuitionUsd || existingUni.tuitionUsd,
            livingCostUsd: scraped.livingCostUsd || existingUni.livingCostUsd,
            intlStudentPct: scraped.intlStudentPct || existingUni.intlStudentPct,
            acceptanceRate: scraped.acceptanceRate ?? existingUni.acceptanceRate,
            logoUrl: scraped.logoUrl || existingUni.logoUrl,
            descriptionEn: scraped.descriptionEn || existingUni.descriptionEn,
            descriptionAr: scraped.descriptionAr || existingUni.descriptionAr,
            pendingReview: false,
          },
        })

        // Mark as approved
        await db.scrapedUniversity.update({
          where: { id },
          data: {
            status: 'approved',
            reviewedAt: new Date(),
            reviewedBy: profile.id,
          },
        })

        return NextResponse.json({
          action: 'approved',
          university: updated,
          message: `Updated existing university: ${scraped.name}`,
        })
      } else {
        // Create new university
        const newUni = await db.university.create({
          data: {
            slug: scraped.slug,
            name: scraped.name,
            country: scraped.country,
            city: scraped.city,
            website: scraped.website || `https://www.google.com/search?q=${encodeURIComponent(scraped.name)}`,
            tuitionUsd: scraped.tuitionUsd || 5000,
            livingCostUsd: scraped.livingCostUsd || 6000,
            intlStudentPct: scraped.intlStudentPct || 15,
            acceptanceRate: scraped.acceptanceRate,
            currency: scraped.currency,
            logoUrl: scraped.logoUrl,
            descriptionEn: scraped.descriptionEn || `${scraped.name} is a university in ${scraped.city}, ${scraped.country}.`,
            descriptionAr: scraped.descriptionAr || '',
            pendingReview: false,
          },
        })

        // Mark as approved
        await db.scrapedUniversity.update({
          where: { id },
          data: {
            status: 'approved',
            reviewedAt: new Date(),
            reviewedBy: profile.id,
          },
        })

        return NextResponse.json({
          action: 'approved',
          university: newUni,
          message: `Created new university: ${scraped.name}`,
        })
      }
    } else {
      // Reject
      await db.scrapedUniversity.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedAt: new Date(),
          reviewedBy: profile.id,
        },
      })

      return NextResponse.json({
        action: 'rejected',
        message: `Rejected: ${scraped.name}`,
      })
    }
  } catch (error) {
    console.error('[api/admin/scraped PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to review scraped university' }, { status: 500 })
  }
}
