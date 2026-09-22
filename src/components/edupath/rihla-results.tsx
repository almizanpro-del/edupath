'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Loader2, Heart, ArrowLeftRight, Calculator,
  MapPin, DollarSign, Star, Award, ExternalLink, RotateCcw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTranslations, useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { formatUsd, formatUsdCompact, countryFlagUrl } from '@/lib/edupath'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import Image from 'next/image'

type Match = {
  universityId: string
  slug: string
  name: string
  country: string
  city: string
  website: string
  tuitionUsd: number
  livingCostUsd: number
  intlStudentPct: number
  acceptanceRate: number | null
  logoUrl: string | null
  relevanceScore: number
  explanation: string
  matchedProgram: {
    id: string
    name: string
    field: string
    degreeLevel: string
    language: string
    tuitionUsd: number
  } | null
  scholarships: Array<{ id: string; name: string; amountUsd: number; amountType: string }>
}

type Props = {
  sessionId: string
  onStartOver: () => void
  intakeProfile?: unknown
}

export function RihlaResults({ sessionId, onStartOver, intakeProfile }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('Agent')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [matches, setMatches] = React.useState<Match[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [savedIds, setSavedIds] = React.useState<Set<string>>(new Set())
  const [compareIds, setCompareIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    // Check auth
    fetch('/api/me')
      .then(r => r.json())
      .then(data => { if (data.profile) setProfile(data.profile) })
      .catch(() => {})

    // Fetch matches
    fetch('/api/agent/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, profile: intakeProfile }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setMatches(data.matches || [])
        setProfile(prev => prev) // keep existing
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : t('errorOccurred'))
      })
      .finally(() => setLoading(false))
  }, [sessionId, t])

  // Load saved universities if logged in
  React.useEffect(() => {
    if (!profile) return
    fetch('/api/saved-lists')
      .then(r => r.ok ? r.json() : { universities: [] })
      .then(data => {
        const saved = new Set<string>((data.universities ?? []).map((u: { id: string }) => u.id))
        setSavedIds(saved)
      })
      .catch(() => {})
  }, [profile])

  const handleSave = async (uni: Match) => {
    if (!profile) {
      toast({ title: t('saveToList'), description: t('anonymousNote') })
      setAuthModalOpen(true)
      return
    }
    const wasSaved = savedIds.has(uni.universityId)
    setSavedIds(prev => {
      const next = new Set(prev)
      if (wasSaved) next.delete(uni.universityId)
      else next.add(uni.universityId)
      return next
    })
    try {
      const res = await fetch('/api/saved-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universityId: uni.universityId }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Rollback
      setSavedIds(prev => {
        const next = new Set(prev)
        if (wasSaved) next.add(uni.universityId)
        else next.delete(uni.universityId)
        return next
      })
      toast({ title: t('errorOccurred'), variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="size-16 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-4">
          <Sparkles className="size-8 text-blue-600 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold mb-2">{t('loadingMatches')}</h3>
        <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
          {t('loadingMatchesDesc')}
        </p>
        <Loader2 className="size-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20" dir={isRTL ? 'rtl' : 'ltr'}>
        <p className="text-rose-600 mb-4">{error}</p>
        <Button onClick={onStartOver} variant="outline" className="gap-2">
          <RotateCcw className="size-4" /> {t('startOver')}
        </Button>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-20" dir={isRTL ? 'rtl' : 'ltr'}>
        <h3 className="text-xl font-bold mb-2">{t('noMatches')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('noMatchesDesc')}</p>
        <Button onClick={onStartOver} variant="outline" className="gap-2">
          <RotateCcw className="size-4" /> {t('startOver')}
        </Button>
      </div>
    )
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('results')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('resultsDesc')}</p>
        </div>
        <Button onClick={onStartOver} variant="outline" size="sm" className="gap-2">
          <RotateCcw className="size-4" /> {t('startOver')}
        </Button>
      </div>

      {/* Match cards */}
      <div className="space-y-4">
        {matches.map((match, idx) => (
          <Card key={match.universityId} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              {/* Top row: rank + name + score */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="size-10 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0 font-bold text-blue-700">
                    #{idx + 1}
                  </div>
                  <Image
                    src={countryFlagUrl(match.country, 40)}
                    alt={match.country}
                    width={32}
                    height={22}
                    className="rounded shrink-0 mt-1"
                    unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-bold text-lg cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => router.push(`/university/${match.slug}`)}
                    >
                      {match.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" /> {match.city}, {match.country}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="size-3 fill-amber-400 text-amber-400" /> {match.intlStudentPct}% intl
                      </span>
                    </div>
                  </div>
                </div>
                {/* Relevance score */}
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(match.relevanceScore)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {t('relevanceScore')}
                  </div>
                </div>
              </div>

              {/* Why this matches */}
              <div className="bg-blue-950/5 dark:bg-blue-950/20 rounded-xl p-3 mb-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {t('whyMatch')}
                    </div>
                    <p dir="auto" className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {match.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('tuition') || 'Tuition'}</div>
                  <div className="font-bold text-blue-600">{formatUsdCompact(match.tuitionUsd)}/yr</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Living</div>
                  <div className="font-bold text-orange-600">{formatUsdCompact(match.livingCostUsd)}/yr</div>
                </div>
                {match.matchedProgram && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('matchedProgram')}</div>
                    <div className="font-medium text-sm truncate">{match.matchedProgram.name}</div>
                  </div>
                )}
              </div>

              {/* Scholarships */}
              {match.scholarships.length > 0 && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Award className="size-4 text-orange-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">{t('scholarshipsAvailable')}:</span>
                  {match.scholarships.map(s => (
                    <Badge key={s.id} variant="secondary" className="text-[10px]">
                      {s.name} ({formatUsdCompact(s.amountUsd)})
                    </Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave(match)}
                  className={cn(
                    'gap-2',
                    savedIds.has(match.universityId) && 'text-rose-600 border-rose-300'
                  )}
                >
                  <Heart className={cn('size-4', savedIds.has(match.universityId) && 'fill-rose-500 text-rose-500')} />
                  {savedIds.has(match.universityId) ? t('saved') : t('saveToList')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/university/${match.slug}`)}
                  className="gap-2"
                >
                  <ExternalLink className="size-4" /> {t('viewDetails')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/university/${match.slug}`)}
                  className="gap-2 ml-auto"
                >
                  <Calculator className="size-4" /> {t('calculateCost')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
    </div>
  )
}
