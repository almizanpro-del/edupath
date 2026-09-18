'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Loader2, TrendingUp, Users, Star, Mail, Download, Eye, Save, GitCompare, AlertCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { createClient } from '@/lib/supabase/client'
import { countryFlagUrl, formatUsd } from '@/lib/edupath'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

type Analytics = {
  id: string; name: string; slug: string; country: string; city: string
  tuitionUsd: number; programCount: number; scholarshipCount: number; reviewCount: number
  avgRating: string
  sentiment: { overall: string; affordability: string; teaching: string; visa: string; safety: string; social: string; sentimentScore: string }
  metrics: { profileViews: number; uniqueVisitors: number; comparisonAppearances: number; saveCount: number; clickThroughRate: string }
}

type Lead = {
  id: string; studentName: string; country: string; gpa: number; field: string
  message: string; date: string; status: string
}

export function SponsorDashboardClient() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('Sponsor')
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [analytics, setAnalytics] = React.useState<Analytics[]>([])
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [totalProfileViews, setTotalProfileViews] = React.useState(0)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [sortBy, setSortBy] = React.useState<'views' | 'rating' | 'name'>('views')

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch('/api/me').then(r => r.json()).then(data => {
          if (data.profile) setProfile(data.profile)
          else setAuthModalOpen(true)
        })
      } else {
        setAuthModalOpen(true)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setProfile(null); setAuthModalOpen(true) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sponsor')
      const data = await res.json()
      if (res.ok) {
        setAnalytics(data.analytics || [])
        setLeads(data.leads || [])
        setTotalProfileViews(data.totalProfileViews || 0)
      } else if (res.status === 403) {
        toast({ title: 'Sponsor access required', description: 'Your account needs recruiter or admin role.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to load dashboard', variant: 'destructive' })
    }
    setLoading(false)
  }, [toast])

  React.useEffect(() => {
    if (profile && (profile.role === 'recruiter' || profile.role === 'admin')) loadData()
  }, [profile, loadData])

  const filtered = React.useMemo(() => {
    let result = analytics
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a => a.name.toLowerCase().includes(q) || a.country.toLowerCase().includes(q))
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'views') return b.metrics.profileViews - a.metrics.profileViews
      if (sortBy === 'rating') return parseFloat(b.avgRating) - parseFloat(a.avgRating)
      return a.name.localeCompare(b.name)
    })
  }, [analytics, searchQuery, sortBy])

  const exportLeads = () => {
    const csv = ['Student,Country,GPA,Field,Date,Status,Message']
    leads.forEach(l => csv.push(`"${l.studentName}","${l.country}","${l.gpa}","${l.field}","${l.date}","${l.status}","${l.message.replace(/"/g, '""')}"`))
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'edupath-leads.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Leads exported', description: `${leads.length} leads downloaded as CSV` })
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Building2 className="size-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('sponsorAccess')}</h2>
            <p className="text-sm text-muted-foreground mb-4">Sign in to access the sponsor dashboard.</p>
            <Button onClick={() => setAuthModalOpen(true)}>{t('signIn')}</Button>
          </CardContent>
        </Card>
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
      </div>
    )
  }

  if (profile.role !== 'recruiter' && profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="size-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('sponsorRequired')}</h2>
            <p className="text-sm text-muted-foreground">Your account needs the 'recruiter' role. Contact your administrator.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-emerald-600" />
              <span className="font-bold">{t('title')}</span>
            </div>
          </div>
          <Button onClick={exportLeads} size="sm" variant="outline" className="gap-2">
            <Download className="size-4" /> Export Leads
          </Button>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-6">
        {loading ? (
          <div className="text-center py-20"><Loader2 className="size-8 animate-spin mx-auto text-slate-400" /></div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
              <TabsTrigger value="universities">{t('universityAnalytics')} ({analytics.length})</TabsTrigger>
              <TabsTrigger value="leads">{t('leadInbox')} ({leads.filter(l => l.status === 'new').length} new)</TabsTrigger>
            </TabsList>

            {/* Overview tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={<Eye className="size-5 text-blue-600" />} label="Total Profile Views" value={totalProfileViews.toLocaleString()} />
                <StatCard icon={<Users className="size-5 text-emerald-600" />} label="Unique Visitors" value={Math.floor(totalProfileViews * 0.7).toLocaleString()} />
                <StatCard icon={<Mail className="size-5 text-amber-600" />} label="Total Leads" value={leads.length.toString()} />
                <StatCard icon={<TrendingUp className="size-5 text-purple-600" />} label="New Leads" value={leads.filter(l => l.status === 'new').length.toString()} />
              </div>

              <Card>
                <CardHeader><CardTitle>{t('howDiscover')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <MetricBar label="Directory browsing" value={45} icon={<Eye className="size-4" />} />
                    <MetricBar label="Comparison tool" value={28} icon={<GitCompare className="size-4" />} />
                    <MetricBar label="Search results" value={18} icon={<TrendingUp className="size-4" />} />
                    <MetricBar label="Saved list views" value={9} icon={<Save className="size-4" />} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">Simulated data for MVP demo. In production, these metrics are tracked via PostHog event analytics.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* University analytics tab */}
            <TabsContent value="universities">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Input placeholder={t('searchUniversities')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-xs" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="views">{t('sortViews')}</SelectItem>
                    <SelectItem value="rating">{t('sortRating')}</SelectItem>
                    <SelectItem value="name">{t('sortName')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {filtered.map(u => <UniversityAnalyticsCard key={u.id} uni={u} />)}
              </div>
            </TabsContent>

            {/* Leads tab */}
            <TabsContent value="leads">
              <div className="space-y-3">
                {leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card><CardContent className="pt-4 pb-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-slate-100 flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </CardContent></Card>
  )
}

function MetricBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="flex items-center gap-2 text-muted-foreground">{icon} {label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function UniversityAnalyticsCard({ uni }: { uni: Analytics }) {
  const [expanded, setExpanded] = React.useState(false)
  const sentimentColor = uni.sentiment.sentimentScore === 'N/A' ? 'text-slate-400' : parseInt(uni.sentiment.sentimentScore) >= 80 ? 'text-emerald-600' : parseInt(uni.sentiment.sentimentScore) >= 60 ? 'text-amber-600' : 'text-rose-600'

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3 mb-3">
          <Image src={countryFlagUrl(uni.country, 40)} alt="" width={28} height={20} className="rounded shrink-0" unoptimized />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{uni.name}</div>
            <div className="text-xs text-muted-foreground">{uni.city}, {uni.country} · {formatUsd(uni.tuitionUsd)}/yr</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-blue-600">{uni.metrics.profileViews}</div>
              <div className="text-[10px] text-muted-foreground">{t('views')}</div>
            </div>
            <div className="text-center">
              <div className="font-bold flex items-center gap-1">
                <Star className="size-3 fill-amber-400 text-amber-400" />{uni.avgRating}
              </div>
              <div className="text-[10px] text-muted-foreground">{uni.reviewCount} reviews</div>
            </div>
            <div className={cn("text-center", sentimentColor)}>
              <div className="font-bold">{uni.sentiment.sentimentScore === 'N/A' ? '—' : `${uni.sentiment.sentimentScore}%`}</div>
              <div className="text-[10px] text-muted-foreground">{t('sentiment')}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-50 rounded p-2 text-center"><div className="font-bold">{uni.metrics.uniqueVisitors}</div><div className="text-muted-foreground">{t('visitors')}</div></div>
          <div className="bg-slate-50 rounded p-2 text-center"><div className="font-bold">{uni.metrics.comparisonAppearances}</div><div className="text-muted-foreground">{t('comparisons')}</div></div>
          <div className="bg-slate-50 rounded p-2 text-center"><div className="font-bold">{uni.metrics.saveCount}</div><div className="text-muted-foreground">{t('saves')}</div></div>
          <div className="bg-slate-50 rounded p-2 text-center"><div className="font-bold">{uni.metrics.clickThroughRate}%</div><div className="text-muted-foreground">{t('ctr')}</div></div>
        </div>

        <button onClick={() => setExpanded(!expanded)} className="text-xs text-emerald-600 hover:underline mt-3 flex items-center gap-1">
          {expanded ? 'Hide' : 'Show'} review sentiment breakdown
          <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            <SentimentBar label="Affordability" value={parseFloat(uni.sentiment.affordability)} />
            <SentimentBar label="Teaching quality" value={parseFloat(uni.sentiment.teaching)} />
            <SentimentBar label="Visa process" value={parseFloat(uni.sentiment.visa)} />
            <SentimentBar label="Safety" value={parseFloat(uni.sentiment.safety)} />
            <SentimentBar label="Social life" value={parseFloat(uni.sentiment.social)} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SentimentBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100
  const color = value >= 4 ? 'bg-emerald-500' : value >= 3 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function LeadCard({ lead }: { lead: Lead }) {
  const statusColors: Record<string, string> = {
    new: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    contacted: 'bg-amber-100 text-amber-700 border-amber-300',
    closed: 'bg-slate-100 text-slate-600 border-slate-300',
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{lead.studentName}</span>
              <Badge variant="outline" className={cn("text-[10px] capitalize", statusColors[lead.status])}>{lead.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {lead.country} · GPA {lead.gpa} · {lead.field}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{lead.date}</span>
        </div>
        <p className="text-sm text-slate-700 bg-slate-50 rounded p-2">{lead.message}</p>
      </CardContent>
    </Card>
  )
}
