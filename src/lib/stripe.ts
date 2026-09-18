/**
 * Stripe configuration, tier definitions, and entitlements.
 *
 * To enable Stripe billing:
 * 1. Create a Stripe account at https://stripe.com
 * 2. Create 5 recurring products with monthly prices (see TIERS below)
 * 3. Copy the price IDs (price_xxx) into the TIERS config
 * 4. Set env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * 5. Set up a webhook endpoint: https://your-domain.com/api/stripe/webhook
 *    Events: checkout.session.completed, customer.subscription.updated,
 *            customer.subscription.deleted
 */

import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion })
  }
  return stripeInstance
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

// ─── Tier Definitions ───────────────────────────────────────────────────────

export type TierId = 'free' | 'premium' | 'pro' | 'vip' | 'sponsor_starter' | 'sponsor_growth'

export type Tier = {
  id: TierId
  name: string
  price: number // USD per month
  priceId: string | null // Stripe price ID (set when Stripe is configured)
  type: 'student' | 'sponsor'
  features: string[]
  cta: string
  highlight?: boolean
}

export const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    type: 'student',
    features: [
      'Browse 107 universities',
      'Advanced search & filters',
      'Side-by-side comparison (up to 3)',
      'Cost calculator',
      '1 AI essay review per month',
      'Read all verified reviews',
    ],
    cta: 'Current Plan',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    priceId: process.env.STRIPE_PRICE_PREMIUM ?? null,
    type: 'student',
    features: [
      'Everything in Free',
      '2 AI essay reviews per month',
      'Unlimited saved lists',
      'Email deadline alerts',
      'Transfer pathway finder',
      'Financial aid matcher',
    ],
    cta: 'Upgrade to Premium',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    priceId: process.env.STRIPE_PRICE_PRO ?? null,
    type: 'student',
    features: [
      'Everything in Premium',
      '20 AI essay reviews per month',
      'Priority support',
      'Advanced scholarship matching',
      'Transfer credit analysis',
    ],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 49.99,
    priceId: process.env.STRIPE_PRICE_VIP ?? null,
    type: 'student',
    features: [
      'Everything in Pro',
      'Unlimited AI essay reviews',
      'Monthly 1:1 advisor call',
      'Early access to new features',
      'Personalized university shortlist',
    ],
    cta: 'Upgrade to VIP',
  },
  {
    id: 'sponsor_starter',
    name: 'Sponsor Starter',
    price: 2000,
    priceId: process.env.STRIPE_PRICE_SPONSOR_STARTER ?? null,
    type: 'sponsor',
    features: [
      'Featured placement in directory',
      'Lead inbox with CSV export',
      'Basic analytics dashboard',
      'Up to 2 university profiles',
    ],
    cta: 'Contact Sales',
  },
  {
    id: 'sponsor_growth',
    name: 'Sponsor Growth',
    price: 5000,
    priceId: process.env.STRIPE_PRICE_SPONSOR_GROWTH ?? null,
    type: 'sponsor',
    features: [
      'Everything in Starter',
      'Full analytics with sentiment',
      'Review monitoring & alerts',
      'Dedicated account manager',
      'Unlimited university profiles',
      'Featured in comparison tool',
    ],
    cta: 'Contact Sales',
    highlight: true,
  },
]

export function getTier(tierId: string): Tier | undefined {
  return TIERS.find(t => t.id === tierId)
}

// ─── Entitlements ───────────────────────────────────────────────────────────

export type Entitlements = {
  essayReviewsPerMonth: number // -1 = unlimited
  savedListsLimit: number // -1 = unlimited
  transferFinder: boolean
  scholarshipMatcher: boolean
  advisorCalls: number
  sponsorDashboard: boolean
  featuredPlacement: boolean
  prioritySupport: boolean
}

export function getEntitlements(tierId: string): Entitlements {
  switch (tierId) {
    case 'premium':
      return { essayReviewsPerMonth: 2, savedListsLimit: -1, transferFinder: true, scholarshipMatcher: true, advisorCalls: 0, sponsorDashboard: false, featuredPlacement: false, prioritySupport: false }
    case 'pro':
      return { essayReviewsPerMonth: 20, savedListsLimit: -1, transferFinder: true, scholarshipMatcher: true, advisorCalls: 0, sponsorDashboard: false, featuredPlacement: false, prioritySupport: true }
    case 'vip':
      return { essayReviewsPerMonth: -1, savedListsLimit: -1, transferFinder: true, scholarshipMatcher: true, advisorCalls: 1, sponsorDashboard: false, featuredPlacement: false, prioritySupport: true }
    case 'sponsor_starter':
      return { essayReviewsPerMonth: 0, savedListsLimit: 0, transferFinder: false, scholarshipMatcher: false, advisorCalls: 0, sponsorDashboard: true, featuredPlacement: true, prioritySupport: false }
    case 'sponsor_growth':
      return { essayReviewsPerMonth: 0, savedListsLimit: 0, transferFinder: false, scholarshipMatcher: false, advisorCalls: 0, sponsorDashboard: true, featuredPlacement: true, prioritySupport: true }
    default: // free
      return { essayReviewsPerMonth: 1, savedListsLimit: 3, transferFinder: true, scholarshipMatcher: true, advisorCalls: 0, sponsorDashboard: false, featuredPlacement: false, prioritySupport: false }
  }
}
