'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Sparkles, Building2, Crown, Loader2, CreditCard, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { createClient } from '@/lib/supabase/client'

type Tier = {
  id: string; name: string; price: number; type: string
  features: string[]; cta: string; highlight?: boolean
}

const TIERS: Tier[] = [
  {
    id: 'free', name: 'Free', price: 0, type: 'student',
    features: ['Browse 107 universities', 'Advanced search & filters', 'Side-by-side comparison (up to 3)', 'Cost calculator', '1 AI essay review per month', 'Read all verified reviews'],
    cta: 'Current Plan',
  },
  {
    id: 'premium', name: 'Premium', price: 9.99, type: 'student',
    features: ['Everything in Free', '2 AI essay reviews per month', 'Unlimited saved lists', 'Email deadline alerts', 'Transfer pathway finder', 'Financial aid matcher'],
    cta: 'Upgrade to Premium', highlight: true,
  },
  {
    id: 'pro', name: 'Pro', price: 19.99, type: 'student',
    features: ['Everything in Premium', '20 AI essay reviews per month', 'Priority support', 'Advanced scholarship matching', 'Transfer credit analysis'],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'vip', name: 'VIP', price: 49.99, type: 'student',
    features: ['Everything in Pro', 'Unlimited AI essay reviews', 'Monthly 1:1 advisor call', 'Early access to new features', 'Personalized university shortlist'],
    cta: 'Upgrade to VIP',
  },
]

const SPONSOR_TIERS: Tier[] = [
  {
    id: 'sponsor_starter', name: 'Sponsor Starter', price: 2000, type: 'sponsor',
    features: ['Featured placement in directory', 'Lead inbox with CSV export', 'Basic analytics dashboard', 'Up to 2 university profiles'],
    cta: 'Contact Sales',
  },
  {
    id: 'sponsor_growth', name: 'Sponsor Growth', price: 5000, type: 'sponsor',
    features: ['Everything in Starter', 'Full analytics with sentiment', 'Review monitoring & alerts', 'Dedicated account manager', 'Unlimited university profiles', 'Featured in comparison tool'],
    cta: 'Contact Sales', highlight: true,
  },
]

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`
  return `$${price.toFixed(2)}`
}

export function PricingClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [currentTier, setCurrentTier] = React.useState('free')
  const [stripeConfigured, setStripeConfigured] = React.useState(false)
  const [loading, setLoading] = React.useState<string | null>(null)

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch('/api/me').then(r => r.json()).then(data => { if (data.profile) setProfile(data.profile) })
        fetch('/api/subscription').then(r => r.json()).then(data => {
          setCurrentTier(data.tier)
          setStripeConfigured(data.stripeConfigured)
        })
      } else {
        fetch('/api/subscription').then(r => r.json()).then(data => {
          setStripeConfigured(data.stripeConfigured)
        })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setProfile(null); setCurrentTier('free') }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleUpgrade = async (tierId: string) => {
    if (!profile) {
      setAuthModalOpen(true)
      return
    }
    if (!stripeConfigured) {
      toast({
        title: 'Payments coming soon',
        description: 'Stripe is not configured yet. Contact us at hello@edupath.com to upgrade manually.',
      })
      return
    }
    setLoading(tierId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error)
      if (data.url) window.location.href = data.url
    } catch (err) {
      toast({ title: 'Checkout failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    }
    setLoading(null)
  }

  const handleManage = async () => {
    setLoading('manage')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error)
      if (data.url) window.location.href = data.url
    } catch {
      toast({ title: 'Failed to open billing portal', variant: 'destructive' })
    }
    setLoading(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-emerald-600" />
            <span className="font-bold">Pricing</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Choose your plan</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Free for students. Premium features for serious applicants. Sponsorships for universities.
          </p>
          {currentTier !== 'free' && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
              <Crown className="size-4" />
              You're on the {currentTier.replace('_', ' ')} plan
              <button onClick={handleManage} className="underline text-xs">Manage</button>
            </div>
          )}
        </div>

        {/* Stripe not configured notice */}
        {!stripeConfigured && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Payments not yet active</p>
              <p className="text-amber-700 mt-1">
                Stripe billing is set up but needs API keys to process payments.
                You can still browse all plans — contact <strong>hello@edupath.com</strong> to upgrade manually.
              </p>
            </div>
          </div>
        )}

        {/* Student tiers */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-2">For Students</h2>
          <p className="text-center text-slate-500 mb-8">Start free, upgrade when you're serious</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map(tier => (
              <Card key={tier.id} className={cn('relative', tier.highlight && 'border-emerald-500 border-2 shadow-lg')}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    {tier.id === 'free' && <Sparkles className="size-4 text-slate-400" />}
                    {tier.id === 'premium' && <Sparkles className="size-4 text-emerald-600" />}
                    {tier.id === 'pro' && <Crown className="size-4 text-blue-600" />}
                    {tier.id === 'vip' && <Crown className="size-4 text-purple-600" />}
                    <span className="font-bold text-lg">{tier.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatPrice(tier.price)}</span>
                    {tier.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={currentTier === tier.id ? 'outline' : tier.highlight ? 'default' : 'outline'}
                    disabled={currentTier === tier.id || loading === tier.id}
                    onClick={() => handleUpgrade(tier.id)}
                  >
                    {loading === tier.id ? <Loader2 className="size-4 animate-spin" /> :
                     currentTier === tier.id ? 'Current Plan' : tier.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sponsor tiers */}
        <div>
          <h2 className="text-2xl font-bold text-center mb-2">For Universities</h2>
          <p className="text-center text-slate-500 mb-8">Recruit qualified MENA students directly</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {SPONSOR_TIERS.map(tier => (
              <Card key={tier.id} className={cn('relative', tier.highlight && 'border-emerald-500 border-2 shadow-lg')}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white">Best Value</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="size-4 text-emerald-600" />
                    <span className="font-bold text-lg">{tier.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatPrice(tier.price)}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={tier.highlight ? 'default' : 'outline'}
                    disabled={loading === tier.id}
                    onClick={() => handleUpgrade(tier.id)}
                  >
                    {loading === tier.id ? <Loader2 className="size-4 animate-spin" /> : tier.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Can I switch plans anytime?</h3>
              <p className="text-sm text-muted-foreground">Yes. Upgrades take effect immediately. Downgrades take effect at the end of your billing period.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Do you offer refunds?</h3>
              <p className="text-sm text-muted-foreground">Yes, within 14 days of purchase if you haven't used premium features. Contact hello@edupath.com.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Is the free plan really free?</h3>
              <p className="text-sm text-muted-foreground">Yes, forever. Browse all 107 universities, compare, and use the cost calculator at no cost.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">How do university sponsorships work?</h3>
              <p className="text-sm text-muted-foreground">Universities get featured placement, a lead inbox, and analytics. Contact us for a demo and custom setup.</p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
    </div>
  )
}
