/** POST /api/stripe/webhook — handle Stripe webhook events */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getStripe, isStripeConfigured, TIERS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = getStripe()!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        const tierId = session.metadata?.tierId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (userId && tierId) {
          // Update or create subscription
          await db.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: session.metadata?.priceId,
              tier: tierId,
              status: 'active',
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              tier: tierId,
              status: 'active',
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string
        const priceId = subscription.items?.data?.[0]?.price?.id
        const tier = TIERS.find(t => t.priceId === priceId)
        const periodEnd =
          subscription.current_period_end ??
          subscription.items?.data?.[0]?.current_period_end

        await db.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: subscription.status,
            stripePriceId: priceId,
            tier: tier?.id ?? 'free',
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer as string

        await db.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: 'canceled', tier: 'free', cancelAtPeriodEnd: false },
        })
        break
      }

      default:
        // Unhandled event type — log but don't error
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe/webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
