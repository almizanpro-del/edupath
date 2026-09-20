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
      else if (res.status === 403) toast({ title: 'Admin access required', variant: 'destructive' })
    } catch { toast({ title: 'Failed to load', variant: 'destructive' }) }
    setLoading(false)
  }, [toast])

  React.useEffect(() => { if (profile?.role === 'admin') loadData() }, [profile, loadData])

  if (!profile) return <GateScreen title="Admin Access Required" desc="Sign in with an admin account." onSignIn={() => setAuthModalOpen(true)} authModalOpen={authModalOpen} setAuthModalOpen={setAuthModalOpen} setProfile={setProfile} />
  if (profile.role !== 'admin') return <GateScreen title="Not an Admin" desc="Run: bun run scripts/promote-admin.ts your@email.com" onSignIn={() => {}} authModalOpen={false} setAuthModalOpen={() => {}} setProfile={() => {}} />

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="size-8 animate-spin text-slate-400" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <AlertCircle className="size-8 text-amber-500 mr-2" /><span>Failed to load analytics</span>
    </div>
  )

  const eventLabels: Record<string, string> = {
    university_view: 'University Views', search: 'Searches', compare: 'Comparisons',
    save: 'Saves', essay_review: 'Essay Reviews', scholarship_match: 'Scholarship Matches',
    transfer_view: 'Transfer Views', contact_form: 'Contact Forms', email_capture: 'Email Captures',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="gap-2"><ArrowLeft className="size-4" /> CMS</Button>
            <div className="flex items-center gap-2"><BarChart3 className="size-5 text-slate-700" /><span className="font-bold">Platform Analytics</span></div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>Refresh</Button>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard icon={<Users className="size-5 text-blue-600" />} label="Total Users" value={data.users.total.toLocaleString()} sub={`+${data.users.new7d} this week`} />
          <StatCard icon={<Building2 className="size-5 text-blue-600" />} label="Universities" value={data.universities.total.toString()} sub={`${data.universities.pendingReview} pending`} />
          <StatCard icon={<Mail className="size-5 text-amber-600" />} label="Total Leads" value={data.leads.total.toString()} sub={`+${data.leads.new7d} this week`} />
          <StatCard icon={<DollarSign className="size-5 text-purple-600" />} label="MRR" value={formatUsd(data.revenue.totalMRR)} sub={`${data.revenue.activeSubscriptions} active subs`} />
          <StatCard icon={<TrendingUp className="size-5 text-rose-600" />} label="Events (30d)" value={data.events.total30d.toLocaleString()} sub="tracked actions" />
          <StatCard icon={<BarChart3 className="size-5 text-slate-600" />} label="Reviews" value={data.content.reviews.toString()} sub={`${data.content.pendingReviews} pending`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue breakdown */}
          <Card>
            <CardHeader><CardTitle>Revenue Breakdown</CardTitle></CardHeader>
            <CardContent>
              {!data.revenue.stripeConfigured ? (
                <p className="text-sm text-muted-foreground">Stripe not configured. Set STRIPE_SECRET_KEY to enable payments.</p>
              ) : Object.keys(data.revenue.byTier).length === 0 ? (
                <p className="text-sm text-muted-foreground">No active subscriptions yet.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.revenue.byTier).map(([tier, info]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{tier.replace('_', ' ')}</Badge>
                        <span className="text-sm">{info.count} subscriber{info.count > 1 ? 's' : ''}</span>
                      </div>
                      <span className="font-bold text-blue-600">{formatUsd(info.mrr)}/mo</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="font-bold">Total MRR</span>
                    <span className="text-2xl font-bold text-blue-700">{formatUsd(data.revenue.totalMRR)}/mo</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event types */}
          <Card>
            <CardHeader><CardTitle>Event Types (30 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(data.events.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{eventLabels[type] ?? type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (count / data.events.total30d) * 100)}%` }} />
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
          <CardHeader><CardTitle>Daily Activity (Last 14 Days)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {data.events.dailyTrend.map((day) => {
                const max = Math.max(...data.events.dailyTrend.map(d => d.count), 1)
                const height = (day.count / max) * 100
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-blue-200 rounded-t hover:bg-blue-400 transition-colors" style={{ height: `${height}%`, minHeight: '2px' }} title={`${day.date}: ${day.count} events`} />
                    <span className="text-[10px] text-muted-foreground rotate-45 origin-left">{day.date.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top universities */}
        <Card>
          <CardHeader><CardTitle>Top 10 Universities by Views</CardTitle></CardHeader>
          <CardContent>
            {data.events.topUniversities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No university views tracked yet.</p>
            ) : (
              <div className="space-y-2">
                {data.events.topUniversities.map((uni, i) => (
                  <div key={uni.slug} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <Image src={countryFlagUrl(uni.country, 40)} alt="" width={20} height={14} className="rounded" unoptimized />
                    <span className="flex-1 text-sm font-medium">{uni.name}</span>
                    <Badge variant="secondary">{uni.views} views</Badge>
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

function GateScreen({ title, desc, onSignIn, authModalOpen, setAuthModalOpen, setProfile }: {
  title: string; desc: string; onSignIn: () => void; authModalOpen: boolean
  setAuthModalOpen: (v: boolean) => void; setProfile: (p: UserProfile) => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <Shield className="size-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground mb-4">{desc}</p>
          <Button onClick={onSignIn}>Sign In</Button>
        </CardContent>
      </Card>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
    </div>
  )
}
