'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X, GraduationCap, Globe2, DollarSign, Star, Shield, Heart, ArrowRight, ArrowLeftRight, CheckCircle2, MapPin, Users, TrendingUp, BookOpen, Languages, Clock, ExternalLink, ThumbsUp, Calculator, MessageSquarePlus, Sparkles, Shuffle, Award, Building2, CreditCard } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatUsd, formatUsdCompact, totalCost, countryFlagUrl } from '@/lib/edupath'
import { cn } from '@/lib/utils'
import { AuthModal, UserMenuButton, type UserProfile } from '@/components/edupath/auth-modal'
import { ReviewForm } from '@/components/edupath/review-form'
import { AdminPanel } from '@/components/edupath/admin-panel'
import { LocaleSwitcher } from '@/components/edupath/locale-switcher'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics-client'
import { useTranslations, useLocale } from 'next-intl'

// =================== Types ===================
type Program = {
  id: string
  name: string
  degreeLevel: string
  field: string
  durationMonths: number
  language: string
  tuitionUsd: number
  deadline: string | null
  entryReqs: string | null
}

type Scholarship = {
  id: string
  name: string
  amountUsd: number
  amountType: string
  eligibility: string
  deadline: string | null
}

type Review = {
  id: string
  userName: string
  userCountry: string
  ratingOverall: number
  ratingAffordability: number
  ratingVisa: number
  ratingTeaching: number
  ratingSafety: number
  ratingSocial: number
  reviewText: string
  helpfulCount: number
  verifiedEnrollment: boolean
  tags: string[]
  createdAt: string
}

type University = {
  id: string
  slug: string
  name: string
  country: string
  city: string
  website: string
  tuitionUsd: number
  livingCostUsd: number
  intlStudentPct: number
  acceptanceRate: number | null
  currency: string
  logoUrl: string | null
  descriptionEn: string
  descriptionAr: string
  programs: Program[]
  scholarships: Scholarship[]
  reviews: Review[]
  avgRating: number | null
  reviewCount: number
  cheapestProgramTuition: number
}

type Country = {
  code: string
  name: string
  nameAr: string
  flag: string
  count: number
  avgTuition: number
}

type Stats = {
  totalUniversities: number
  totalCountries: number
  totalPrograms: number
  cheapestTuition: number
}

type Props = {
  universities: University[]
  countries: Country[]
  stats: Stats
}

// =================== Helpers ===================
function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          className={cn(
            i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </div>
  )
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  )
}

// =================== Main Component ===================
export function EduPathApp({ universities, countries, stats }: Props) {
  const { toast } = useToast()
  const t = useTranslations()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCountries, setSelectedCountries] = React.useState<Set<string>>(new Set())
  const [selectedFields, setSelectedFields] = React.useState<Set<string>>(new Set())
  const [selectedLanguages, setSelectedLanguages] = React.useState<Set<string>>(new Set())
  const [tuitionRange, setTuitionRange] = React.useState<[number, number]>([0, 25000])
  const [sortBy, setSortBy] = React.useState<'tuition-asc' | 'tuition-desc' | 'rating-desc' | 'name-asc'>('tuition-asc')
  const [selectedUni, setSelectedUni] = React.useState<University | null>(null) // kept for review form refetch logic; modal removed
  const [compareList, setCompareList] = React.useState<University[]>([])
  const [savedUniversities, setSavedUniversities] = React.useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = React.useState(false)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [visibleCount, setVisibleCount] = React.useState(24) // pagination: 24 per page

  // Auth state
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [reviewFormOpen, setReviewFormOpen] = React.useState(false)
  const [reviewFormUni, setReviewFormUni] = React.useState<University | null>(null)
  const [adminPanelOpen, setAdminPanelOpen] = React.useState(false)
  // Local override of reviews per university (after a fresh submission)
  const [reviewOverrides, setReviewOverrides] = React.useState<Record<string, Review[]>>({})

  // Check auth on mount
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch('/api/me').then(r => r.json()).then(data => {
          if (data.profile) setProfile(data.profile)
        }).catch(() => {})
      }
    })
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setSavedUniversities(new Set())
      } else if (event === 'SIGNED_IN' && session) {
        fetch('/api/me').then(r => r.json()).then(data => {
          if (data.profile) setProfile(data.profile)
        }).catch(() => {})
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load saved universities when profile changes
  React.useEffect(() => {
    if (!profile) return
    fetch('/api/saved-lists')
      .then(r => r.ok ? r.json() : { universities: [] })
      .then(data => {
        const ids = new Set<string>((data.universities ?? []).map((u: { id: string }) => u.id))
        setSavedUniversities(ids)
      })
      .catch(() => {})
  }, [profile])

  // Apply filters
  const filtered = React.useMemo(() => {
    let result = universities.filter(u => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matches =
          u.name.toLowerCase().includes(q) ||
          u.country.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q) ||
          u.programs.some(p => p.name.toLowerCase().includes(q) || p.field.toLowerCase().includes(q))
        if (!matches) return false
      }
      if (selectedCountries.size > 0 && !selectedCountries.has(u.country)) return false
      if (selectedFields.size > 0) {
        const uniFields = new Set(u.programs.map(p => p.field))
        const hasMatch = [...selectedFields].some(f => uniFields.has(f))
        if (!hasMatch) return false
      }
      if (selectedLanguages.size > 0) {
        const uniLangs = new Set(u.programs.map(p => p.language))
        const hasMatch = [...selectedLanguages].some(l => uniLangs.has(l))
        if (!hasMatch) return false
      }
      if (u.cheapestProgramTuition < tuitionRange[0] || u.cheapestProgramTuition > tuitionRange[1]) return false
      return true
    })

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'tuition-asc': return a.cheapestProgramTuition - b.cheapestProgramTuition
        case 'tuition-desc': return b.cheapestProgramTuition - a.cheapestProgramTuition
        case 'rating-desc':
          return (b.avgRating ?? 0) - (a.avgRating ?? 0)
        case 'name-asc': return a.name.localeCompare(b.name)
      }
    })

    return result
  }, [universities, searchQuery, selectedCountries, selectedFields, selectedLanguages, tuitionRange, sortBy])

  // Reset pagination when filters change
  React.useEffect(() => {
    setVisibleCount(24)
  }, [searchQuery, selectedCountries, selectedFields, selectedLanguages, tuitionRange, sortBy])

  const toggleCountry = (c: string) => {
    const next = new Set(selectedCountries)
    if (next.has(c)) next.delete(c); else next.add(c)
    setSelectedCountries(next)
  }
  const toggleField = (f: string) => {
    const next = new Set(selectedFields)
    if (next.has(f)) next.delete(f); else next.add(f)
    setSelectedFields(next)
  }
  const toggleLanguage = (l: string) => {
    const next = new Set(selectedLanguages)
    if (next.has(l)) next.delete(l); else next.add(l)
    setSelectedLanguages(next)
  }

  const clearFilters = () => {
    setSelectedCountries(new Set())
    setSelectedFields(new Set())
    setSelectedLanguages(new Set())
    setTuitionRange([0, 25000])
    setSearchQuery('')
  }

  const toggleSave = async (uni: University) => {
    if (!profile) {
      toast({
        title: 'Sign in to save universities',
        description: 'Create a free account to bookmark universities and write reviews.',
      })
      setAuthModalOpen(true)
      return
    }
    // Optimistic update
    const wasSaved = savedUniversities.has(uni.id)
    const next = new Set(savedUniversities)
    if (wasSaved) {
      next.delete(uni.id)
    } else {
      next.add(uni.id)
    }
    setSavedUniversities(next)
    try {
      const res = await fetch('/api/saved-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universityId: uni.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({
        title: data.action === 'saved' ? 'Saved to your list' : 'Removed from saved list',
        description: uni.name,
      })
    } catch (err) {
      // Rollback
      const rollback = new Set(savedUniversities)
      if (wasSaved) rollback.add(uni.id); else rollback.delete(uni.id)
      setSavedUniversities(rollback)
      toast({ title: 'Failed to save', variant: 'destructive' })
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setProfile(null)
    setSavedUniversities(new Set())
    toast({ title: 'Signed out', description: 'See you soon!' })
  }

  const openReviewForm = (uni: University) => {
    if (!profile) {
      toast({
        title: 'Sign in to write a review',
        description: 'Reviews help other MENA students make informed decisions.',
      })
      setAuthModalOpen(true)
      return
    }
    setReviewFormUni(uni)
    setReviewFormOpen(true)
  }

  const handleReviewSubmitted = async () => {
    if (!reviewFormUni) return
    // Refetch reviews for this university from the DB
    try {
      const res = await fetch(`/api/reviews?universityId=${reviewFormUni.id}`, { method: 'GET' })
      if (!res.ok) return
      const data = await res.json()
      if (data.reviews) {
        setReviewOverrides(prev => ({ ...prev, [reviewFormUni.id]: data.reviews }))
        // Also update the selectedUni if it's the same
        if (selectedUni?.id === reviewFormUni.id) {
          setSelectedUni({
            ...selectedUni,
            reviews: data.reviews,
            reviewCount: data.reviews.length,
            avgRating: data.reviews.length > 0
              ? data.reviews.reduce((s: number, r: Review) => s + r.ratingOverall, 0) / data.reviews.length
              : null,
          })
        }
      }
    } catch (e) {
      // The new review won't show until a refresh — acceptable for MVP
    }
  }

  const toggleCompare = (uni: University) => {
    if (compareList.find(u => u.id === uni.id)) {
      setCompareList(compareList.filter(u => u.id !== uni.id))
    } else {
      if (compareList.length >= 3) {
        toast({
          title: 'Compare list full',
          description: 'You can compare up to 3 universities at a time. Remove one to add another.',
          variant: 'destructive',
        })
        return
      }
      setCompareList([...compareList, uni])
    }
  }

  const activeFilterCount =
    selectedCountries.size + selectedFields.size + selectedLanguages.size +
    (tuitionRange[0] > 0 || tuitionRange[1] < 25000 ? 1 : 0)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/40 via-white to-white">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                <GraduationCap className="size-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold leading-none">EduPath</div>
                <div className="text-[10px] text-muted-foreground leading-none mt-0.5">Your path to affordable global education</div>
              </div>
            </button>
            <nav className="hidden md:flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/essay-review')}
                className="gap-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
              >
                <Sparkles className="size-4" />
                Essay Review
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/transfer-finder')}
                className="gap-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
              >
                <Shuffle className="size-4" />
                Transfer Finder
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/scholarships')}
                className="gap-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
              >
                <Award className="size-4" />
                Scholarships
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/pricing')}
                className="gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              >
                <CreditCard className="size-4" />
                Pricing
              </Button>
            </nav>
            {/* Mobile: condensed nav */}
            <div className="md:hidden flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/essay-review')}
                className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                title="Essay Review"
              >
                <Sparkles className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/transfer-finder')}
                className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                title="Transfer Finder"
              >
                <Shuffle className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/scholarships')}
                className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                title="Scholarships"
              >
                <Award className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/pricing')}
                className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                title="Pricing"
              >
                <CreditCard className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {compareList.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompare(true)}
                className="gap-2"
              >
                <ArrowLeftRight className="size-4" />
                {t('Nav.compare')} ({compareList.length})
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-2" title={t('Nav.saved')}>
              <Heart className="size-4" />
              <span className="hidden sm:inline">{t('Nav.saved')} ({savedUniversities.size})</span>
            </Button>
            {profile?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin')}
                className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Shield className="size-4" />
                <span className="hidden sm:inline">{t('Nav.admin')}</span>
              </Button>
            )}
            {(profile?.role === 'recruiter' || profile?.role === 'admin') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/sponsor')}
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <Building2 className="size-4" />
                <span className="hidden sm:inline">Sponsor</span>
              </Button>
            )}
            <LocaleSwitcher />
            <UserMenuButton
              profile={profile}
              onSignInClick={() => setAuthModalOpen(true)}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="border-b bg-gradient-to-br from-slate-900 via-teal-900 to-blue-950 text-white">
        <div className="container mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 bg-white/15 text-white border-white/20 hover:bg-white/20">
              {t('Hero.badge')}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {t('Hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-8 leading-relaxed">
              {t('Hero.subtitle', { count: stats.totalCountries })}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <Input
                  placeholder={t('Hero.searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      track('search', { metadata: { query: searchQuery } })
                    }
                  }}
                  className="pl-10 h-12 bg-white text-foreground border-0 shadow-lg"
                />
              </div>
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button size="lg" variant="secondary" className="h-12 gap-2 shadow-lg">
                    <SlidersHorizontal className="size-5" />
                    {t('Hero.filters')}
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-1 bg-emerald-600">{activeFilterCount}</Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center justify-between">
                      <span>{t('Filters.title')}</span>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>{t('Filters.clearAll')}</Button>
                      )}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-8 space-y-6 mt-4">
                    <div>
                      <Label className="text-sm font-semibold mb-3 block">{t('Filters.country')}</Label>
                      <div className="space-y-2">
                        {countries.map(c => (
                          <div key={c.code} className="flex items-center space-x-2">
                            <Checkbox
                              id={`c-${c.code}`}
                              checked={selectedCountries.has(c.code)}
                              onCheckedChange={() => toggleCountry(c.code)}
                            />
                            <Label htmlFor={`c-${c.code}`} className="text-sm cursor-pointer flex-1 flex items-center gap-2">
                              <span>{c.flag}</span>
                              <span>{c.name}</span>
                              <span className="text-xs text-muted-foreground">({c.count})</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm font-semibold mb-3 block">{t('Filters.fieldOfStudy')}</Label>
                      <div className="space-y-2">
                        {['Computer Science', 'Engineering', 'Business', 'Medicine', 'Social Sciences'].map(f => (
                          <div key={f} className="flex items-center space-x-2">
                            <Checkbox
                              id={`f-${f}`}
                              checked={selectedFields.has(f)}
                              onCheckedChange={() => toggleField(f)}
                            />
                            <Label htmlFor={`f-${f}`} className="text-sm cursor-pointer">{f}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm font-semibold mb-3 block">{t('Filters.languageOfInstruction')}</Label>
                      <div className="space-y-2">
                        {['English', 'Arabic', 'German', 'Turkish'].map(l => (
                          <div key={l} className="flex items-center space-x-2">
                            <Checkbox
                              id={`l-${l}`}
                              checked={selectedLanguages.has(l)}
                              onCheckedChange={() => toggleLanguage(l)}
                            />
                            <Label htmlFor={`l-${l}`} className="text-sm cursor-pointer">{l}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold">{t('Filters.annualTuition')}</Label>
                        <span className="text-xs text-muted-foreground">
                          {formatUsd(tuitionRange[0])} - {formatUsd(tuitionRange[1])}
                        </span>
                      </div>
                      <div className="px-2">
                        <Slider
                          value={tuitionRange}
                          onValueChange={(v) => setTuitionRange(v as [number, number])}
                          min={0}
                          max={25000}
                          step={500}
                          className="mt-4"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>$0</span>
                        <span>$25K+</span>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/15">
                <div className="text-2xl font-bold">{stats.totalUniversities}</div>
                <div className="text-sm text-white/75">{t('Hero.stats.universities')}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/15">
                <div className="text-2xl font-bold">{stats.totalCountries}</div>
                <div className="text-sm text-white/75">{t('Hero.stats.countries')}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/15">
                <div className="text-2xl font-bold">{stats.totalPrograms}</div>
                <div className="text-sm text-white/75">{t('Hero.stats.programs')}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/15">
                <div className="text-2xl font-bold">{formatUsdCompact(stats.cheapestTuition)}</div>
                <div className="text-sm text-white/75">{t('Hero.stats.fromPerYear')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Country Explorer ===== */}
      <section className="border-b bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-10">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">{t('CountryExplorer.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('CountryExplorer.subtitle')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
            {countries.map(c => (
              <button
                key={c.code}
                onClick={() => toggleCountry(c.code)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all hover:shadow-md',
                  selectedCountries.has(c.code)
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                    : 'border-border bg-white hover:border-emerald-300'
                )}
              >
                <Image
                  src={`https://flagcdn.com/w80/${c.flag}.png`}
                  alt={c.name}
                  width={40}
                  height={28}
                  className="rounded shadow-sm"
                  unoptimized
                />
                <div className="text-xs font-medium text-center leading-tight">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{c.count} unis</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Directory ===== */}
      <section className="container mx-auto max-w-7xl px-4 py-10 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {t('Directory.universities', { count: filtered.length })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeFilterCount > 0
                ? t('Directory.filtersApplied', { count: activeFilterCount })
                : t('Directory.showingAll')}
            </p>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('Directory.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tuition-asc">{t('Directory.sort.tuitionAsc')}</SelectItem>
              <SelectItem value="tuition-desc">{t('Directory.sort.tuitionDesc')}</SelectItem>
              <SelectItem value="rating-desc">{t('Directory.sort.ratingDesc')}</SelectItem>
              <SelectItem value="name-asc">{t('Directory.sort.nameAsc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">{t('Directory.noResults')}</h3>
            <p className="text-muted-foreground mb-4">{t('Directory.noResultsDesc')}</p>
            <Button onClick={clearFilters} variant="outline">{t('Directory.clearAll')}</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.slice(0, visibleCount).map(u => (
                <UniversityCard
                  key={u.id}
                  uni={u}
                  isSaved={savedUniversities.has(u.id)}
                  isComparing={!!compareList.find(c => c.id === u.id)}
                  onSave={() => toggleSave(u)}
                  onCompare={() => toggleCompare(u)}
                  onOpen={() => router.push(`/university/${u.slug}`)}
                />
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div className="text-center mt-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Showing {visibleCount} of {filtered.length} universities
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="gap-2"
                >
                  Load More ({filtered.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t bg-slate-50 mt-auto">
        <div className="container mx-auto max-w-7xl px-4 py-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="size-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                  <GraduationCap className="size-4 text-white" />
                </div>
                <span className="font-bold">EduPath</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('Footer.tagline')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">{t('Footer.platform')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('Footer.items.directory')}</li>
                <li>{t('Footer.items.comparison')}</li>
                <li>{t('Footer.items.calculator')}</li>
                <li>{t('Footer.items.reviews')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">{t('Footer.coverage')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{stats.totalUniversities} {t('Hero.stats.universities').toLowerCase()}</li>
                <li>{stats.totalCountries} {t('Hero.stats.countries').toLowerCase()}</li>
                <li>{stats.totalPrograms} {t('Hero.stats.programs').toLowerCase()}</li>
                <li>{t('Footer.englishArabic')}</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 text-center text-xs text-muted-foreground">
            {t('Footer.disclaimer')}
          </div>
        </div>
      </footer>

      {/* (University detail is now a full page at /university/[slug]) */}

      {/* ===== Comparison Sheet ===== */}
      <Sheet open={showCompare} onOpenChange={setShowCompare}>
        <SheetContent side="bottom" className="h-[90vh] max-w-none w-full p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <span>{t('Compare.title', { count: compareList.length })}</span>
              <Button variant="ghost" size="sm" onClick={() => setCompareList([])} disabled={compareList.length === 0}>
                {t('Compare.clearAll')}
              </Button>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(90vh-80px)]">
            {compareList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                <ArrowLeftRight className="size-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('Compare.empty')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('Compare.emptyDesc')}
                </p>
              </div>
            ) : (
              <ComparisonTable universities={compareList} />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ===== Auth Modal ===== */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthed={(p) => setProfile(p)}
      />

      {/* ===== Review Form Modal ===== */}
      {reviewFormUni && (
        <ReviewForm
          open={reviewFormOpen}
          onClose={() => {
            setReviewFormOpen(false)
            setReviewFormUni(null)
          }}
          universityId={reviewFormUni.id}
          universityName={reviewFormUni.name}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      {/* ===== Admin Moderation Panel ===== */}
      <AdminPanel
        open={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
      />
    </div>
  )
}

// =================== University Card ===================
function UniversityCard({
  uni, isSaved, isComparing, onSave, onCompare, onOpen,
}: {
  uni: University
  isSaved: boolean
  isComparing: boolean
  onSave: () => void
  onCompare: () => void
  onOpen: () => void
}) {
  const t = useTranslations('UniversityCard')
  return (
    <Card className="group hover:shadow-lg transition-all hover:border-emerald-300 cursor-pointer relative" onClick={onOpen}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Image
                src={countryFlagUrl(uni.country, 40)}
                alt={uni.country}
                width={24}
                height={16}
                className="rounded shadow-sm shrink-0"
                unoptimized
              />
              <Badge variant="outline" className="text-xs font-normal">
                <MapPin className="size-3 mr-1" />
                {uni.city}, {uni.country}
              </Badge>
            </div>
            <CardTitle className="text-base leading-tight line-clamp-2">{uni.name}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn('size-8 shrink-0', isSaved && 'text-rose-500')}
            onClick={(e) => { e.stopPropagation(); onSave() }}
          >
            <Heart className={cn('size-4', isSaved && 'fill-current')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{uni.descriptionEn}</p>

        {uni.avgRating !== null && uni.reviewCount > 0 ? (
          <div className="flex items-center gap-2">
            <StarRating value={uni.avgRating} />
            <span className="text-xs text-muted-foreground">{t('reviewCount', { count: uni.reviewCount })}</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">{t('noReviews')}</div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('from')}</div>
            <div className="text-sm font-bold text-emerald-700">{formatUsdCompact(uni.cheapestProgramTuition)}{t('perYear')}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('living')}</div>
            <div className="text-sm font-semibold">{formatUsdCompact(uni.livingCostUsd)}{t('perYear')}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('intlPct')}</div>
            <div className="text-sm font-semibold">{uni.intlStudentPct}%</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {uni.programs.slice(0, 3).map(p => (
            <Badge key={p.id} variant="secondary" className="text-[10px] font-normal">
              {p.field}
            </Badge>
          ))}
          {uni.programs.length > 3 && (
            <Badge variant="outline" className="text-[10px] font-normal">
              +{uni.programs.length - 3} {t('more')}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); onOpen() }}>
            {t('viewDetails')}
            <ArrowRight className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant={isComparing ? 'default' : 'outline'}
            onClick={(e) => { e.stopPropagation(); onCompare() }}
            className={cn(isComparing && 'bg-emerald-600 hover:bg-emerald-700')}
          >
            <ArrowLeftRight className="size-3.5" />
            {isComparing ? t('comparing') : t('compare')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// (UniversityDetail modal removed — now a full page at /university/[slug])
// (See src/components/edupath/university-detail-page.tsx)
// =================== Comparison Table ===================
function ComparisonTable({ universities }: { universities: University[] }) {
  const t = useTranslations('Compare.rows')
  const rows: Array<{ label: string; render: (u: University) => React.ReactNode }> = [
    { label: t('country'), render: u => (
      <span className="flex items-center gap-2">
        <Image src={countryFlagUrl(u.country, 40)} alt={u.country} width={20} height={14} className="rounded shadow-sm" unoptimized />
        {u.country}
      </span>
    ) },
    { label: t('city'), render: u => u.city },
    { label: t('cheapestTuition'), render: u => <span className="font-semibold text-emerald-700">{formatUsd(u.cheapestProgramTuition)}</span> },
    { label: t('livingCost'), render: u => formatUsd(u.livingCostUsd) },
    { label: t('total3yrCost'), render: u => <span className="font-semibold">{formatUsd(totalCost(u.cheapestProgramTuition, u.livingCostUsd, 36))}</span> },
    { label: t('intlPct'), render: u => `${u.intlStudentPct}%` },
    { label: t('acceptance'), render: u => u.acceptanceRate !== null ? `${u.acceptanceRate}%` : 'N/A' },
    { label: t('programs'), render: u => t('programsValue', { count: u.programs.length }) },
    { label: t('scholarships'), render: u => t('scholarshipsValue', { count: u.scholarships.length }) },
    { label: t('reviews'), render: u => u.reviewCount > 0 ? t('reviewsValue', { rating: u.avgRating?.toFixed(1) ?? '0', count: u.reviewCount }) : t('reviewsNone') },
    { label: t('languages'), render: u => [...new Set(u.programs.map(p => p.language))].join(', ') },
    { label: t('fields'), render: u => [...new Set(u.programs.map(p => p.field))].slice(0, 4).join(', ') },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-white z-10">
          <tr>
            <th className="text-left p-4 border-b font-semibold text-sm w-40">{t('metric')}</th>
            {universities.map(u => (
              <th key={u.id} className="text-left p-4 border-b font-semibold text-sm min-w-[200px]">
                <div className="flex items-start gap-2">
                  <Image src={countryFlagUrl(u.country, 80)} alt={u.country} width={32} height={22} className="rounded shadow-sm shrink-0" unoptimized />
                  <div>
                    <div className="leading-tight">{u.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{u.city}</div>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50/50' : ''}>
              <td className="p-4 text-sm font-medium border-b">{row.label}</td>
              {universities.map(u => (
                <td key={u.id} className="p-4 text-sm border-b">{row.render(u)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
