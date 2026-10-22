/**
 * Server-side entitlement enforcement.
 *
 * This module is the SINGLE SOURCE OF TRUTH for "is this user allowed to
 * do this action?" It reads the user's subscription tier from the database
 * and checks it against the entitlements defined in src/lib/stripe.ts.
 *
 * WHY THIS EXISTS:
 *   Before Phase 2, the pricing page advertised tier-based limits
 *   (1 essay review/mo on Free, 2 on Premium, etc.) but NO API route
 *   actually checked entitlements. Every authenticated user got the same
 *   flat 3-per-hour rate limit on essay reviews, regardless of tier.
 *   This module closes that gap.
 *
 * DURING THE PRE-PAYMENT PERIOD (Stripe not yet active in Jordan):
 *   All users are on the 'free' tier. The entitlements below reflect the
 *   free limits. When Stripe comes online, updateSubscriptionTier() will
 *   set the actual tier from the Stripe webhook, and these helpers will
 *   automatically start returning the upgraded entitlements — no code
 *   changes needed.
 *
 * USAGE in an API route:
 *   import { requireFeature } from '@/lib/entitlements'
 *
 *   export async function POST(req: NextRequest) {
 *     const profile = await getOrCreateProfile()
 *     if (!profile) return NextResponse.json({ error: 'Auth required' }, { status: 401 })
 *
 *     const allowed = await requireFeature(profile.id, 'essayReviewsPerMonth', { count: true })
 *     if (!allowed.ok) return NextResponse.json({ error: allowed.reason }, { status: 402 })
 *     // ... proceed with the action
 *   }
 */
import { db } from '@/lib/db'
import { getEntitlements, type Entitlements } from '@/lib/stripe'

/**
 * Get the user's current subscription tier.
 * Returns 'free' if no subscription record exists, if the DB is
 * unavailable, or if the subscription status is not 'active'.
 */
export async function getUserTier(userId: string): Promise<string> {
  try {
    const sub = await db.subscription.findUnique({
      where: { userId },
      select: { tier: true, status: true, currentPeriodEnd: true },
    })
    if (!sub) return 'free'
    if (sub.status !== 'active') return 'free'
    // Check if the subscription has expired
    if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) {
      return 'free'
    }
    return sub.tier
  } catch {
    // DB unavailable — default to free tier
    return 'free'
  }
}

/**
 * Get the effective entitlements for a user.
 * This is the main entry point for "what can this user do?"
 */
export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  const tier = await getUserTier(userId)
  return getEntitlements(tier)
}

/**
 * Count how many of a given action the user has performed this month.
 * Used for monthly-limited features like essayReviewsPerMonth.
 *
 * The `feature` parameter maps to a specific DB table/count.
 */
export async function getMonthlyUsageCount(
  userId: string,
  feature: 'essayReviews' | 'savedLists'
): Promise<number> {
  try {
    if (feature === 'essayReviews') {
      // Count EssayReview records created this month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return await db.essayReview.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      })
    }
    if (feature === 'savedLists') {
      return await db.savedList.count({ where: { userId } })
    }
  } catch {
    // DB unavailable — return 0 so the user isn't blocked
    return 0
  }
  return 0
}

type FeatureCheck =
  | { feature: 'essayReviewsPerMonth'; count: true }
  | { feature: 'savedListsLimit'; count: true }
  | { feature: 'transferFinder' }
  | { feature: 'scholarshipMatcher' }
  | { feature: 'sponsorDashboard' }
  | { feature: 'featuredPlacement' }
  | { feature: 'prioritySupport' }

type FeatureResult =
  | { ok: true; remaining: number | null; limit: number | null }
  | { ok: false; reason: string; remaining: number | null; limit: number | null }

/**
 * Check whether a user is allowed to perform a specific action.
 *
 * For countable features (essayReviewsPerMonth, savedListsLimit):
 *   - Returns { ok: true, remaining: N } if under the limit
 *   - Returns { ok: false, reason: '...' } if at or over the limit
 *   - limit: -1 means unlimited — always ok
 *
 * For boolean features (transferFinder, etc.):
 *   - Returns { ok: true } if the entitlement is true
 *   - Returns { ok: false, reason: '...' } otherwise
 *
 * The `count: true` flag tells the helper to query the DB for current
 * monthly usage before deciding. Without it, the helper just checks the
 * boolean entitlement.
 */
export async function requireFeature(
  userId: string,
  check: FeatureCheck
): Promise<FeatureResult> {
  const entitlements = await getUserEntitlements(userId)

  // Countable features
  if ('count' in check && check.count === true) {
    if (check.feature === 'essayReviewsPerMonth') {
      const limit = entitlements.essayReviewsPerMonth
      if (limit === -1) {
        return { ok: true, remaining: null, limit: null } // unlimited
      }
      const used = await getMonthlyUsageCount(userId, 'essayReviews')
      const remaining = Math.max(0, limit - used)
      if (remaining <= 0) {
        return {
          ok: false,
          reason: `You've used all ${limit} essay review${limit !== 1 ? 's' : ''} for this month. Upgrade your plan for more.`,
          remaining: 0,
          limit,
        }
      }
      return { ok: true, remaining, limit }
    }

    if (check.feature === 'savedListsLimit') {
      const limit = entitlements.savedListsLimit
      if (limit === -1) {
        return { ok: true, remaining: null, limit: null }
      }
      const used = await getMonthlyUsageCount(userId, 'savedLists')
      const remaining = Math.max(0, limit - used)
      if (remaining <= 0) {
        return {
          ok: false,
          reason: `You've reached the limit of ${limit} saved universities on the Free plan. Upgrade for unlimited saves.`,
          remaining: 0,
          limit,
        }
      }
      return { ok: true, remaining, limit }
    }
  }

  // Boolean features
  if (check.feature === 'transferFinder') {
    return entitlements.transferFinder
      ? { ok: true, remaining: null, limit: null }
      : { ok: false, reason: 'Transfer Finder is a Premium feature.', remaining: null, limit: null }
  }
  if (check.feature === 'scholarshipMatcher') {
    return entitlements.scholarshipMatcher
      ? { ok: true, remaining: null, limit: null }
      : { ok: false, reason: 'Scholarship Matcher is a Premium feature.', remaining: null, limit: null }
  }
  if (check.feature === 'sponsorDashboard') {
    return entitlements.sponsorDashboard
      ? { ok: true, remaining: null, limit: null }
      : { ok: false, reason: 'Sponsor Dashboard requires a Sponsor plan.', remaining: null, limit: null }
  }

  // Fallback — shouldn't reach here
  return { ok: false, reason: 'Feature not recognized', remaining: null, limit: null }
}

/**
 * Helper: is Stripe billing active?
 * During the pre-payment period, this returns false, and all users
 * are on the 'free' tier. When Stripe is configured and a webhook
 * sets a user's tier, getUserTier() will return the upgraded tier.
 */
export function isBillingActive(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}
