/** POST /api/stripe/checkout — create a Stripe Checkout Session for upgrading */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { getStripe, isStripeConfigured, TIERS, type TierId } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({
      error: 'Stripe not configured',
      message: 'Set STRIPE_SECRET_KEY and STRIPE_PRICE_* env vars to enable payments.',
    }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const body = await req.json()
  const { tierId } = body as { tierId: TierId }

  const tier = TIERS.find(t => t.id === tierId)
  if (!tier || !tier.priceId) {
    return NextResponse.json({ error: 'Invalid tier or price not configured' }, { status: 400 })
  }

  const stripe = getStripe()!

  try {
    // Find or create Prisma user
    let profile = await db.user.findUnique({ where: { supabaseId: user.id } })
    if (!profile) {
      profile = await db.user.create({
        data: { supabaseId: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? 'Student', country: 'Jordan' },
      })
    }

    // Find or create subscription record
    let sub = await db.subscription.findUnique({ where: { userId: profile.id } })
    if (!sub) {
      sub = await db.subscription.create({
        data: { userId: profile.id, tier: 'free', status: 'none' },
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email ?? undefined,
      line_items: [{ price: tier.priceId, quantity: 1 }],
      success_url: `${req.headers.get('origin')}/pricing?status=success`,
      cancel_url: `${req.headers.get('origin')}/pricing?status=canceled`,
      client_reference_id: profile.id,
      metadata: { userId: profile.id, tierId },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/checkout] Error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
