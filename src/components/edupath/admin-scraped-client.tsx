'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Shield, Search, Check, X, Loader2, AlertCircle,
  Globe, Database, Filter, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { createClient } from '@/lib/supabase/client'
import { countryFlagUrl } from '@/lib/edupath'
import Image from 'next/image'

type ScrapedUni = {
  id: string
  slug: string
  name: string
  country: string
  city: string
  website: string | null
  tuitionUsd: number
  livingCostUsd: number
  intlStudentPct: number
  acceptanceRate: number | null
  currency: string
  logoUrl: string | null
  descriptionEn: string | null
  descriptionAr: string | null
  source: string
  normalizedName: string
  qualityScore: number
  qualityBreakdown: string | null
  status: string
  scrapedAt: string
  reviewedAt: string | null
}

const STATUS_COLORS: Record<string, string> = {
  auto_approved: 'bg-green-100 text-green-700 border-green-300',
  manual_review: 'bg-amber-100 text-amber-700 border-amber-300',
  auto_rejected: 'bg-rose-100 text-rose-700 border-rose-300',
  approved: 'bg-blue-600/10 text-blue-700 border-blue-600/30',
  rejected: 'bg-slate-100 text-slate-500 border-slate-300',
}

const STATUS_LABELS: Record<string, string> = {
  auto_approved: 'Auto-Approved',
  manual_review: 'Needs Review',
  auto_rejected: 'Auto-Rejected',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function AdminScrapedClient() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('AdminScraped')
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [records, setRecords] = React.useState<ScrapedUni[]>([])
  const [summary, setSummary] = React.useState<Record<string, number>>({})
  const [loading, setLoading] = React.useState(true)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('manual_review')
  const [sourceFilter, setSourceFilter] = React.useState<string>('all')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

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
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      if (searchQuery) params.set('q', searchQuery)
      params.set('limit', '100')

      const res = await fetch(`/api/admin/scraped?${params}`)
      if (res.status === 403) {
        toast({ title: t('adminRequired'), variant: 'destructive' })
        return
      }
      const data = await res.json()
      setRecords(data.records ?? [])
      setSummary(data.summary?.byStatus ?? {})
    } catch {
      toast({ title: t('loadFailed'), variant: 'destructive' })
    }
    setLoading(false)
  }, [statusFilter, sourceFilter, searchQuery, toast, t])

  React.useEffect(() => {
    if (profile?.role === 'admin') loadData()
  }, [profile, loadData])

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/scraped/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({
        title: action === 'approve' ? t('approved') : t('rejected'),
        description: data.message,
      })

      // Remove from list (or update status)
      setRecords(prev => prev.filter(r => r.id !== id))
      // Update summary counts
      setSummary(prev => ({
        ...prev,
        [action === 'approve' ? 'approved' : 'rejected']: (prev[action === 'approve' ? 'approved' : 'rejected'] ?? 0) + 1,
        manual_review: Math.max(0, (prev.manual_review ?? 0) - 1),
      }))
    } catch (err) {
      toast({
        title: t('reviewFailed'),
        description: err instanceof Error ? err.message : t('tryAgain'),
        variant: 'destructive',
      })
    }
    setActionLoading(null)
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="size-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('adminRequired')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t('adminDesc')}</p>
            <Button onClick={() => setAuthModalOpen(true)}>{t('signIn')}</Button>
          </CardContent>
        </Card>
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
      </div>
    )
  }

  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="size-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('notAdmin')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t('notAdminDesc')}</p>
            <Button onClick={() => router.push('/admin')}>{t('backToAdmin')}</Button>
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
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="gap-2">
              <ArrowLeft className="size-4" /> {t('cms')}
            </Button>
            <div className="flex items-center gap-2">
              <Database className="size-5 text-slate-700" />
              <span className="font-bold">{t('title')}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : t('refresh')}
          </Button>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard label={t('needsReview')} value={summary.manual_review ?? 0} color="text-amber-600" />
          <SummaryCard label={t('autoApproved')} value={summary.auto_approved ?? 0} color="text-green-600" />
          <SummaryCard label={t('autoRejected')} value={summary.auto_rejected ?? 0} color="text-rose-600" />
          <SummaryCard label={t('approved')} value={summary.approved ?? 0} color="text-blue-600" />
          <SummaryCard label={t('rejected')} value={summary.rejected ?? 0} color="text-slate-600" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="size-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="manual_review">{t('needsReview')}</SelectItem>
              <SelectItem value="auto_approved">{t('autoApproved')}</SelectItem>
              <SelectItem value="auto_rejected">{t('autoRejected')}</SelectItem>
              <SelectItem value="approved">{t('approved')}</SelectItem>
              <SelectItem value="rejected">{t('rejected')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[150px]">
              <Globe className="size-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allSources')}</SelectItem>
              <SelectItem value="openalex">OpenAlex</SelectItem>
              <SelectItem value="wikipedia">Wikipedia</SelectItem>
              <SelectItem value="curated">{t('curated')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Records list */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <Database className="size-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">{t('noRecords')}</h3>
            <p className="text-sm text-muted-foreground">{t('noRecordsDesc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <ScrapedCard
                key={record.id}
                record={record}
                onApprove={() => handleReview(record.id, 'approve')}
                onReject={() => handleReview(record.id, 'reject')}
                actionLoading={actionLoading === record.id}
                expanded={expandedId === record.id}
                onToggleExpand={() => setExpandedId(expandedId === record.id ? null : record.id)}
              />
            ))}
          </div>
        )}
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className={cn('text-2xl font-bold', color)}>{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  )
}

function ScrapedCard({
  record, onApprove, onReject, actionLoading, expanded, onToggleExpand,
}: {
  record: ScrapedUni
  onApprove: () => void
  onReject: () => void
  actionLoading: boolean
  expanded: boolean
  onToggleExpand: () => void
}) {
  const t = useTranslations('AdminScraped')
  const qualityColor = record.qualityScore >= 60 ? 'text-green-600'
    : record.qualityScore >= 30 ? 'text-amber-600'
    : 'text-rose-600'

  let breakdown: Record<string, { weight: number; earned: number; passed: boolean }> = {}
  try {
    breakdown = record.qualityBreakdown ? JSON.parse(record.qualityBreakdown) : {}
  } catch {
    // ignore parse errors
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {record.logoUrl ? (
              <Image src={record.logoUrl} alt="" width={40} height={40} className="rounded shrink-0" unoptimized />
            ) : (
              <Image
                src={countryFlagUrl(record.country, 40)}
                alt={record.country}
                width={32}
                height={22}
                className="rounded shrink-0 mt-1"
                unoptimized
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{record.name}</span>
                <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[record.status])}>
                  {STATUS_LABELS[record.status] ?? record.status}
                </Badge>
                <Badge variant="secondary" className="text-[10px] capitalize">{record.source}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {record.city}, {record.country} · {t('qualityScore')}: {' '}
                <span className={cn('font-bold', qualityColor)}>{record.qualityScore}/100</span>
              </div>
              {record.descriptionEn && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {record.descriptionEn.slice(0, 200)}
                  {record.descriptionEn.length > 200 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(record.status === 'manual_review' || record.status === 'auto_approved') && (
              <>
                <Button
                  size="sm"
                  className="gap-1 bg-blue-600 hover:bg-blue-700"
                  onClick={onApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {t('approve')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-rose-600 hover:bg-rose-50"
                  onClick={onReject}
                  disabled={actionLoading}
                >
                  <X className="size-4" />
                  {t('reject')}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleExpand}
              aria-label={expanded ? t('collapse') : t('expand')}
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Quality breakdown */}
            <div>
              <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">
                {t('qualityBreakdown')}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(breakdown).map(([field, info]) => (
                  <div key={field} className="text-xs bg-slate-50 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{field}</span>
                      <span className={info.passed ? 'text-green-600' : 'text-muted-foreground'}>
                        {info.earned}/{info.weight}
                      </span>
                    </div>
                    <div className={cn('text-[10px]', info.passed ? 'text-green-600' : 'text-muted-foreground')}>
                      {info.passed ? '✓' : '✗'} {field}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Detail label={t('slug')} value={record.slug} />
              <Detail label={t('website')} value={record.website || '—'} />
              <Detail label={t('tuition')} value={record.tuitionUsd ? `$${record.tuitionUsd}/yr` : '—'} />
              <Detail label={t('livingCost')} value={record.livingCostUsd ? `$${record.livingCostUsd}/yr` : '—'} />
              <Detail label={t('intlStudents')} value={record.intlStudentPct ? `${record.intlStudentPct}%` : '—'} />
              <Detail label={t('acceptanceRate')} value={record.acceptanceRate ? `${record.acceptanceRate}%` : '—'} />
              <Detail label={t('scrapedAt')} value={new Date(record.scrapedAt).toLocaleDateString()} />
              <Detail label={t('source')} value={record.source} />
            </div>

            {record.descriptionEn && (
              <div>
                <h4 className="text-xs font-semibold mb-1 uppercase tracking-wider text-muted-foreground">
                  {t('description')}
                </h4>
                <p className="text-xs text-slate-600">{record.descriptionEn}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  )
}
