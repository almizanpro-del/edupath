'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart3, Users, Building2, Mail, DollarSign, TrendingUp, Loader2, Shield, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { countryFlagUrl, formatUsd } from '@/lib/edupath'
import { useTranslations } from 'next-intl'

type Analytics = {
  users: { total: number; new30d: number; new7d: number }
  universities: { total: number; pendingReview: number }
  content: { programs: number; scholarships: number; reviews: number; pendingReviews: number; approvedReviews: number }
  leads: { total: number; new7d: number; new30d: number }
  revenue: { activeSubscriptions: number; totalMRR: number; byTier: Record<string, { count: number; mrr: number }>; stripeConfigured: boolean }
  events: {
    total30d: number
    byType: Record<string, number>
    dailyTrend: Array<{ date: string; count: number }>
    topUniversities: Array<{ name: string; slug: string; country: string; views: number }>
  }
}

export function AdminAnalyticsClient() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('AdminAnalytics')
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<Analytics | null>(null)

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch('/api/me').then(r => r.json()).then(d => { if (d.profile) setProfile(d.profile) })
      } else { setAuthModalOpen(true) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setProfile(null); setAuthModalOpen(true) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics')
      const d = await res.json()
      if (res.ok) setData(d)
      else if (res.status === 403) toast({ title: t('adminRequired'), variant: 'destructive' })
    } catch { toast({ title: t('loadFailed'), variant: 'destructive' }) }
    setLoading(false)
  }, [toast, t])

  React.useEffect(() => { if (profile?.role === 'admin') loadData() }, [profile, loadData])

  if (!profile) return <GateScreen title={t('adminRequired')} desc={t('signInDesc')} onSignIn={() => setAuthModalOpen(true)} authModalOpen={authModalOpen} setAuthModalOpen={setAuthModalOpen} setProfile={setProfile} t={t} />
  if (profile.role !== 'admin') return <GateScreen title={t('notAdmin')} desc={t('notAdminDesc')} onSignIn={() => {}} authModalOpen={false} setAuthModalOpen={() => {}} setProfile={() => {}} t={t} />

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="size-8 animate-spin text-slate-400" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <AlertCircle className="size-8 text-amber-500 mr-2" /><span>{t('loadFailed')}</span>
    </div>
  )

  const eventLabels: Record<string, string> = {
    university_view: t('evtUniversityView'), search: t('evtSearch'), compare: t('evtCompare'),
    save: t('evtSave'), essay_review: t('evtEssayReview'), scholarship_match: t('evtScholarshipMatch'),
    transfer_view: t('evtTransferView'), contact_form: t('evtContactForm'), email_capture: t('evtEmailCapture'),
    contact_open: t('evtContactOpen'), contact_submit: t('evtContactSubmit'),
    university_claim: t('evtUniversityClaim'), filter_apply: t('evtFilterApply'), share: t('evtShare'),
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="gap-2"><ArrowLeft className="size-4" /> {t('cms')}</Button>
            <div className="flex items-center gap-2"><BarChart3 className="size-5 text-slate-700" /><span className="font-bold">{t('title')}</span></div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>{t('refresh')}</Button>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard icon={<Users className="size-5 text-blue-600" />} label={t('totalUsers')} value={data.users.total.toLocaleString()} sub={`+${data.users.new7d} ${t('thisWeek')}`} />
          <StatCard icon={<Building2 className="size-5 text-blue-600" />} label={t('universities')} value={data.universities.total.toString()} sub={`${data.universities.pendingReview} ${t('pendingReview')}`} />
          <StatCard icon={<Mail className="size-5 text-amber-600" />} label={t('totalLeads')} value={data.leads.total.toString()} sub={`+${data.leads.new7d} ${t('thisWeek')}`} />
          <StatCard icon={<DollarSign className="size-5 text-purple-600" />} label={t('mrr')} value={formatUsd(data.revenue.totalMRR)} sub={`${data.revenue.activeSubscriptions} ${t('activeSubs')}`} />
          <StatCard icon={<TrendingUp className="size-5 text-rose-600" />} label={t('events30d')} value={data.events.total30d.toLocaleString()} sub={t('trackedActions')} />
          <StatCard icon={<BarChart3 className="size-5 text-slate-600" />} label={t('reviews')} value={data.content.reviews.toString()} sub={`${data.content.pendingReviews} ${t('pendingReview')}`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue breakdown */}
          <Card>
            <CardHeader><CardTitle>{t('revenueBreakdown')}</CardTitle></CardHeader>
            <CardContent>
              {!data.revenue.stripeConfigured ? (
                <p className="text-sm text-muted-foreground">{t('stripeNotConfigured')}</p>
              ) : Object.keys(data.revenue.byTier).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noSubscriptions')}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.revenue.byTier).map(([tier, info]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{tier.replace('_', ' ')}</Badge>
                        <span className="text-sm">{info.count} {info.count > 1 ? t('subscribers') : t('subscriber')}</span>
                      </div>
                      <span className="font-bold text-blue-600">{formatUsd(info.mrr)}{t('perMonth')}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="font-bold">{t('totalMrr')}</span>
                    <span className="text-2xl font-bold text-blue-700">{formatUsd(data.revenue.totalMRR)}{t('perMonth')}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event types */}
          <Card>
            <CardHeader><CardTitle>{t('eventsByType')}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(data.events.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{eventLabels[type] ?? type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-950/50 rounded-full" style={{ width: `${Math.min(100, (count / data.events.total30d) * 100)}%` }} />
                      </div>
                      <span className="font-medium w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily trend */}
        <Card>
          <CardHeader><CardTitle>{t('dailyActivity')}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {data.events.dailyTrend.map((day) => {
                const max = Math.max(...data.events.dailyTrend.map(d => d.count), 1)
                const height = (day.count / max) * 100
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-blue-600/40 rounded-t hover:bg-blue-400 transition-colors" style={{ height: `${height}%`, minHeight: '2px' }} title={`${day.date}: ${day.count} ${t('events')}`} />
                    <span className="text-[10px] text-muted-foreground rotate-45 origin-left">{day.date.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top universities */}
        <Card>
          <CardHeader><CardTitle>{t('topUniversities')}</CardTitle></CardHeader>
          <CardContent>
            {data.events.topUniversities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noUniversityViews')}</p>
            ) : (
              <div className="space-y-2">
                {data.events.topUniversities.map((uni, i) => (
                  <div key={uni.slug} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <Image src={countryFlagUrl(uni.country, 40)} alt="" width={20} height={14} className="rounded" unoptimized />
                    <span className="flex-1 text-sm font-medium">{uni.name}</span>
                    <Badge variant="secondary">{uni.views} {t('views')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card><CardContent className="pt-4 pb-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center">{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </CardContent></Card>
  )
}

function GateScreen({ title, desc, onSignIn, authModalOpen, setAuthModalOpen, setProfile, t }: {
  title: string; desc: string; onSignIn: () => void; authModalOpen: boolean
  setAuthModalOpen: (v: boolean) => void; setProfile: (p: UserProfile) => void
  t: (key: string) => string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <Shield className="size-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground mb-4">{desc}</p>
          <Button onClick={onSignIn}>{t('signIn')}</Button>
        </CardContent>
      </Card>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
    </div>
  )
}
