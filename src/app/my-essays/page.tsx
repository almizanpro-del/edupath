/**
 * /my-essays
 *
 * Shows the user's essay review history. Each entry displays:
 *   - Date
 *   - Target university/program (if provided)
 *   - Overall score
 *   - 4 dimension scores (mini bar chart)
 *   - Expandable: full essay text + feedback (strengths, weaknesses,
 *     line feedback, rewrite summary)
 *
 * Also shows the current month's usage vs entitlement limit at the top.
 */
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getUserTier, getMonthlyUsageCount } from '@/lib/entitlements'
import { getEntitlements } from '@/lib/stripe'
import { MyEssaysClient } from './my-essays-client'

export const metadata: Metadata = {
  title: 'My Essay Reviews',
  description: 'Your AI essay review history and progress.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function MyEssaysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  type Feedback = {
    scores: { structure: number; tone: number; clarity: number; cultural_fit: number }
    overall_score: number
    strengths: string[]
    weaknesses: string[]
    line_feedback: Array<{ quote: string; issue: string; suggestion: string }>
    rewrite_summary: string
  }
  let reviews: Array<{
    id: string
    essayText: string
    feedback: Feedback
    overallScore: number
    targetUniversity: string | null
    targetProgram: string | null
    applicantCountry: string | null
    createdAt: string
  }> = []
  let usage = { used: 0, limit: 1, tier: 'free' as string }

  try {
    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    })

    if (profile) {
      const tier = await getUserTier(profile.id)
      const entitlements = getEntitlements(tier)
      const used = await getMonthlyUsageCount(profile.id, 'essayReviews')
      usage = {
        used,
        limit: entitlements.essayReviewsPerMonth,
        tier,
      }

      const dbReviews = await db.essayReview.findMany({
        where: { userId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          essayText: true,
          feedback: true,
          overallScore: true,
          targetUniversity: true,
          targetProgram: true,
          applicantCountry: true,
          createdAt: true,
        },
      })

      reviews = dbReviews.map(r => ({
        id: r.id,
        essayText: r.essayText,
        feedback: JSON.parse(r.feedback) as Feedback,
        overallScore: r.overallScore,
        targetUniversity: r.targetUniversity,
        targetProgram: r.targetProgram,
        applicantCountry: r.applicantCountry,
        createdAt: r.createdAt.toISOString(),
      }))
    }
  } catch (err) {
    console.warn('[my-essays] DB unavailable:', err)
  }

  return <MyEssaysClient reviews={reviews} usage={usage} />
}
