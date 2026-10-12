'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Shuffle, Loader2, FileText, DollarSign, GraduationCap, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { countryFlagUrl, formatUsd, formatUsdCompact } from '@/lib/edupath'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

type University = { id: string; name: string; country: string; city: string }

type Pathway = {
  id: string
  creditsAccepted: number
  totalCredits: number
  agreementType: string
  notes: string
  requirements: string | null
  estimatedSavingsUsd: number | null
  fromUniversity: University & { slug: string; tuitionUsd: number; livingCostUsd: number }
  toUniversity: University & { slug: string; tuitionUsd: number; livingCostUsd: number }
}

export function TransferFinderClient({ universities }: { universities: University[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('TransferFinder')
  const [pathways, setPathways] = React.useState<Pathway[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)

  const [fromCountry, setFromCountry] = React.useState('')
  const [toCountry, setToCountry] = React.useState('')

  const fetchPathways = async (fCountry?: string, tCountry?: string) => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (fCountry) params.set('fromCountry', fCountry)
      if (tCountry) params.set('toCountry', tCountry)
      const res = await fetch(`/api/transfer-pathways?${params}`)
      const data = await res.json()
      setPathways(data.pathways ?? [])
    } catch {
      toast({ title: t('failedToLoad'), variant: 'destructive' })
    }
    setLoading(false)
  }

  // Load all pathways on mount
  React.useEffect(() => {
    fetchPathways()
  }, [])

  const handleSearch = () => {
    fetchPathways(fromCountry || undefined, toCountry || undefined)
  }

  const clearFilters = () => {
    setFromCountry('')
    setToCountry('')
    fetchPathways()
  }

  // Get unique countries from universities
  const countries = React.useMemo(() => {
    const set = new Set(universities.map(u => u.country))
    return Array.from(set).sort()
  }, [universities])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{t('back')}</span>
          </Button>
          <div className="flex items-center gap-2">
            <Shuffle className="size-5 text-blue-600" />
            <span className="font-bold">{t('title')}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300 text-sm font-medium mb-4">
            <Shuffle className="size-4" />
            {t('badge')}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {t('heading')}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Search filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('from')}</Label>
                <Select value={fromCountry} onValueChange={setFromCountry}>
                  <SelectTrigger><SelectValue placeholder={t('anyUniversity')} /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden md:flex items-center pb-2">
                <ArrowRight className="size-5 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('to')}</Label>
                <Select value={toCountry} onValueChange={setToCountry}>
                  <SelectTrigger><SelectValue placeholder={t('anyUniversity')} /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Shuffle className="size-4" /> {t('search')}
                </Button>
                {(fromCountry || toCountry) && (
                  <Button variant="outline" onClick={clearFilters}>{t('clear')}</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="size-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        ) : pathways.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">{t('noResults')}</h3>
            <p className="text-muted-foreground">{t('noResultsDesc')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('pathwaysFound', { count: pathways.length })}</p>
            {pathways.map(p => <PathwayCard key={p.id} pathway={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function PathwayCard({ pathway }: { pathway: Pathway }) {
  const t = useTranslations('TransferFinder')
  const transferPct = Math.round((pathway.creditsAccepted / pathway.totalCredits) * 100)
  const agreementColors: Record<string, string> = {
    official: 'bg-blue-600/10 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300 border-blue-300',
    informal: 'bg-amber-100 text-amber-700 border-amber-300',
    'case-by-case': 'bg-blue-600/10 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300 border-blue-300',
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        {/* From → To header */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Image src={countryFlagUrl(pathway.fromUniversity.country, 40)} alt="" width={24} height={16} className="rounded" unoptimized />
            <div>
              <div className="font-semibold text-sm">{pathway.fromUniversity.name}</div>
              <div className="text-xs text-muted-foreground">{pathway.fromUniversity.city}, {pathway.fromUniversity.country}</div>
            </div>
          </div>
          <ArrowRight className="size-5 text-blue-600 mx-2" />
          <div className="flex items-center gap-2">
            <Image src={countryFlagUrl(pathway.toUniversity.country, 40)} alt="" width={24} height={16} className="rounded" unoptimized />
            <div>
              <div className="font-semibold text-sm">{pathway.toUniversity.name}</div>
              <div className="text-xs text-muted-foreground">{pathway.toUniversity.city}, {pathway.toUniversity.country}</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><GraduationCap className="size-3" /> {t('creditsTransfer')}</div>
            <div className="text-lg font-bold">{pathway.creditsAccepted}/{pathway.totalCredits}</div>
            <div className="text-xs text-blue-600 font-medium">{transferPct}%</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><DollarSign className="size-3" /> {t('estSavings')}</div>
            <div className="text-lg font-bold text-blue-700">{pathway.estimatedSavingsUsd ? formatUsdCompact(pathway.estimatedSavingsUsd) : '—'}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><FileText className="size-3" /> {t('agreement')}</div>
            <Badge variant="outline" className={cn('text-xs capitalize', agreementColors[pathway.agreementType])}>{pathway.agreementType === 'case-by-case' ? t('caseByCase') : pathway.agreementType === 'official' ? t('official') : t('informal')}</Badge>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><DollarSign className="size-3" /> {t('tuitionDiff')}</div>
            <div className="text-lg font-bold">{formatUsdCompact(pathway.toUniversity.tuitionUsd - pathway.fromUniversity.tuitionUsd)}</div>
          </div>
        </div>

        {/* Notes */}
        <p className="text-sm text-slate-700 mb-3">{pathway.notes}</p>

        {/* Requirements */}
        {pathway.requirements && (
          <div className="text-xs bg-amber-50 border border-amber-200 rounded p-3 mb-3">
            <strong>{t('requirements')}:</strong> {pathway.requirements}
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{t('creditsAccepted')}</span>
            <span>{transferPct}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-500 rounded-full" style={{ width: `${transferPct}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
