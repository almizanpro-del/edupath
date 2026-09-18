/** POST /api/stripe/portal — create a Stripe Customer Portal session for managing subscription */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    let profile = await db.user.findUnique({ where: { supabaseId: user.id } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const sub = await db.subscription.findUnique({ where: { userId: profile.id } })
    if (!sub?.stripeCustomerId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    const stripe = getStripe()!
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${req.headers.get('origin')}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/portal] Error:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
