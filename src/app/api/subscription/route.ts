/** GET /api/subscription — get current user's subscription + entitlements */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { getEntitlements, getTier, isStripeConfigured } from '@/lib/stripe'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ tier: 'free', entitlements: getEntitlements('free'), stripeConfigured: isStripeConfigured() })
  }

  try {
    let profile = await db.user.findUnique({ where: { supabaseId: user.id } })
    if (!profile) {
      return NextResponse.json({ tier: 'free', entitlements: getEntitlements('free'), stripeConfigured: isStripeConfigured() })
    }

    const sub = await db.subscription.findUnique({ where: { userId: profile.id } })
    const tierId = sub?.status === 'active' ? sub.tier : 'free'
    const tier = getTier(tierId)

    return NextResponse.json({
      tier: tierId,
      tierName: tier?.name ?? 'Free',
      status: sub?.status ?? 'none',
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      entitlements: getEntitlements(tierId),
      stripeConfigured: isStripeConfigured(),
    })
  } catch {
    return NextResponse.json({ tier: 'free', entitlements: getEntitlements('free'), stripeConfigured: isStripeConfigured() })
  }
}
