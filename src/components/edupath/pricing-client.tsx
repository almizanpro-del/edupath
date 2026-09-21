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
import { useTranslations, useLocale } from 'next-intl'
import { formatUsd } from '@/lib/edupath'

type Tier = {
  id: string; nameKey: string; price: number; type: string
  featureKeys: string[]; ctaKey: string; highlight?: boolean
}

const TIERS: Tier[] = [
  {
    id: 'free', nameKey: 'free', price: 0, type: 'student',
    featureKeys: ['freeF1', 'freeF2', 'freeF3', 'freeF4', 'freeF5', 'freeF6'],
    ctaKey: 'currentPlan',
  },
  {
    id: 'premium', nameKey: 'premium', price: 9.99, type: 'student',
    featureKeys: ['premiumF1', 'premiumF2', 'premiumF3', 'premiumF4', 'premiumF5', 'premiumF6'],
    ctaKey: 'upgradePremium', highlight: true,
  },
  {
    id: 'pro', nameKey: 'pro', price: 19.99, type: 'student',
    featureKeys: ['proF1', 'proF2', 'proF3', 'proF4', 'proF5'],
    ctaKey: 'upgradePro',
  },
  {
    id: 'vip', nameKey: 'vip', price: 49.99, type: 'student',
    featureKeys: ['vipF1', 'vipF2', 'vipF3', 'vipF4', 'vipF5'],
    ctaKey: 'upgradeVip',
  },
]

const SPONSOR_TIERS: Tier[] = [
  {
    id: 'sponsor_starter', nameKey: 'starter', price: 2000, type: 'sponsor',
    featureKeys: ['starterF1', 'starterF2', 'starterF3', 'starterF4'],
    ctaKey: 'contactSales',
  },
  {
    id: 'sponsor_growth', nameKey: 'growth', price: 5000, type: 'sponsor',
    featureKeys: ['growthF1', 'growthF2', 'growthF3', 'growthF4', 'growthF5', 'growthF6'],
    ctaKey: 'contactSales', highlight: true,
  },
]

function formatPrice(price: number, locale: string, freeLabel: string): string {
  if (price === 0) return freeLabel
  if (price >= 1000) {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(price)
  }
  return formatUsd(price)
}

export function PricingClient() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('Pricing')
  const locale = useLocale()
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
        title: t('paymentsComingSoon'),
        description: t('paymentsComingSoonDesc'),
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
      toast({ title: t('checkoutFailed'), description: err instanceof Error ? err.message : t('checkoutFailedDesc'), variant: 'destructive' })
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
      toast({ title: t('portalFailed'), variant: 'destructive' })
    }
    setLoading(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="size-4" /> {t('back')}
          </Button>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-blue-600" />
            <span className="font-bold">{t('title')}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('choosePlan')}</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          {currentTier !== 'free' && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-blue-600/10 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300 text-sm font-medium">
              <Crown className="size-4" />
              {t('currentTierPlan', { tier: currentTier.replace('_', ' ') })}
              <button onClick={handleManage} className="underline text-xs">{t('manage')}</button>
            </div>
          )}
        </div>

        {/* Stripe not configured notice */}
        {!stripeConfigured && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">{t('paymentsNotActive')}</p>
              <p className="text-amber-700 mt-1">
                {t('paymentsNotActiveDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Student tiers */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-2">{t('forStudents')}</h2>
          <p className="text-center text-slate-500 mb-8">{t('studentsSubtitle')}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map(tier => (
              <Card key={tier.id} className={cn('relative', tier.highlight && 'border-blue-500 border-2 shadow-lg')}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">{t('mostPopular')}</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    {tier.id === 'free' && <Sparkles className="size-4 text-slate-400" />}
                    {tier.id === 'premium' && <Sparkles className="size-4 text-blue-600" />}
                    {tier.id === 'pro' && <Crown className="size-4 text-blue-600" />}
                    {tier.id === 'vip' && <Crown className="size-4 text-purple-600" />}
                    <span className="font-bold text-lg">{t(tier.nameKey)}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatPrice(tier.price, locale, t('free'))}</span>
                    {tier.price > 0 && <span className="text-sm text-muted-foreground">{t('perMonth')}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {tier.featureKeys.map((fKey, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>{t(fKey)}</span>
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
                     currentTier === tier.id ? t('currentPlan') : t(tier.ctaKey)}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sponsor tiers */}
        <div>
          <h2 className="text-2xl font-bold text-center mb-2">{t('forUniversities')}</h2>
          <p className="text-center text-slate-500 mb-8">{t('sponsorSubtitle')}</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {SPONSOR_TIERS.map(tier => (
              <Card key={tier.id} className={cn('relative', tier.highlight && 'border-blue-500 border-2 shadow-lg')}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">{t('bestValue')}</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="size-4 text-blue-600" />
                    <span className="font-bold text-lg">{t(tier.nameKey)}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatPrice(tier.price, locale, t('free'))}</span>
                    <span className="text-sm text-muted-foreground">{t('perMonth')}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {tier.featureKeys.map((fKey, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>{t(fKey)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={tier.highlight ? 'default' : 'outline'}
                    disabled={loading === tier.id}
                    onClick={() => handleUpgrade(tier.id)}
                  >
                    {loading === tier.id ? <Loader2 className="size-4 animate-spin" /> : t(tier.ctaKey)}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t('faq')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">{t('faqQ1')}</h3>
              <p className="text-sm text-muted-foreground">{t('faqA1')}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('faqQ2')}</h3>
              <p className="text-sm text-muted-foreground">{t('faqA2')}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('faqQ3')}</h3>
              <p className="text-sm text-muted-foreground">{t('faqA3')}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('faqQ4')}</h3>
              <p className="text-sm text-muted-foreground">{t('faqA4')}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('faqQ5')}</h3>
              <p className="text-sm text-muted-foreground">{t('faqA5')}</p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
    </div>
  )
}
