'use client'

import * as React from 'react'
import { Search, SlidersHorizontal, X, GraduationCap, Globe2, DollarSign, Star, Shield, Heart, ArrowRight, ArrowLeftRight, CheckCircle2, MapPin, Users, TrendingUp, BookOpen, Languages, Clock, ExternalLink, ThumbsUp, Calculator, MessageSquarePlus } from 'lucide-react'
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
import { formatUsd, formatUsdCompact, totalCost, countryFlag } from '@/lib/edupath'
import { cn } from '@/lib/utils'
import { AuthModal, UserMenuButton, type UserProfile } from '@/components/edupath/auth-modal'
import { ReviewForm } from '@/components/edupath/review-form'
import { AdminPanel } from '@/components/edupath/admin-panel'
import { LocaleSwitcher } from '@/components/edupath/locale-switcher'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

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
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCountries, setSelectedCountries] = React.useState<Set<string>>(new Set())
  const [selectedFields, setSelectedFields] = React.useState<Set<string>>(new Set())
  const [selectedLanguages, setSelectedLanguages] = React.useState<Set<string>>(new Set())
  const [tuitionRange, setTuitionRange] = React.useState<[number, number]>([0, 25000])
  const [sortBy, setSortBy] = React.useState<'tuition-asc' | 'tuition-desc' | 'rating-desc' | 'name-asc'>('tuition-asc')
  const [selectedUni, setSelectedUni] = React.useState<University | null>(null)
  const [compareList, setCompareList] = React.useState<University[]>([])
  const [savedUniversities, setSavedUniversities] = React.useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = React.useState(false)
  const [filtersOpen, setFiltersOpen] = React.useState(false)

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
            <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
              <GraduationCap className="size-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold leading-none">EduPath</div>
              <div className="text-[10px] text-muted-foreground leading-none mt-0.5">Your path to affordable global education</div>
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
                onClick={() => setAdminPanelOpen(true)}
                className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Shield className="size-4" />
                <span className="hidden sm:inline">{t('Nav.admin')}</span>
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
      <section className="border-b bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white">
        <div className="container mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="max-w-3xl">
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
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
                      )}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-8 space-y-6 mt-4">
                    <div>
                      <Label className="text-sm font-semibold mb-3 block">Country</Label>
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
                      <Label className="text-sm font-semibold mb-3 block">Field of Study</Label>
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
                      <Label className="text-sm font-semibold mb-3 block">Language of Instruction</Label>
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
                        <Label className="text-sm font-semibold">Annual Tuition (USD)</Label>
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
                <div className="text-3xl">{c.flag}</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(u => (
              <UniversityCard
                key={u.id}
                uni={u}
                isSaved={savedUniversities.has(u.id)}
                isComparing={!!compareList.find(c => c.id === u.id)}
                onSave={() => toggleSave(u)}
                onCompare={() => toggleCompare(u)}
                onOpen={() => setSelectedUni(u)}
              />
            ))}
          </div>
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

      {/* ===== University Detail Dialog ===== */}
      {selectedUni && (
        <UniversityDetail
          uni={selectedUni}
          isSaved={savedUniversities.has(selectedUni.id)}
          isComparing={!!compareList.find(c => c.id === selectedUni.id)}
          isLoggedIn={!!profile}
          onSave={() => toggleSave(selectedUni)}
          onCompare={() => toggleCompare(selectedUni)}
          onWriteReview={() => openReviewForm(selectedUni)}
          onClose={() => setSelectedUni(null)}
        />
      )}

      {/* ===== Comparison Sheet ===== */}
      <Sheet open={showCompare} onOpenChange={setShowCompare}>
        <SheetContent side="bottom" className="h-[90vh] max-w-none w-full p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <span>Compare {compareList.length} universit{compareList.length === 1 ? 'y' : 'ies'}</span>
              <Button variant="ghost" size="sm" onClick={() => setCompareList([])} disabled={compareList.length === 0}>
                Clear all
              </Button>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(90vh-80px)]">
            {compareList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                <ArrowLeftRight className="size-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No universities to compare yet</h3>
                <p className="text-sm text-muted-foreground">
                  Click the compare button on any university card to add it here. You can compare up to 3 at a time.
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
  return (
    <Card className="group hover:shadow-lg transition-all hover:border-emerald-300 cursor-pointer relative" onClick={onOpen}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{countryFlag(uni.country)}</span>
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
            <span className="text-xs text-muted-foreground">({uni.reviewCount} review{uni.reviewCount > 1 ? 's' : ''})</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">No reviews yet - be the first!</div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">From</div>
            <div className="text-sm font-bold text-emerald-700">{formatUsdCompact(uni.cheapestProgramTuition)}/yr</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Living</div>
            <div className="text-sm font-semibold">{formatUsdCompact(uni.livingCostUsd)}/yr</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Intl %</div>
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
              +{uni.programs.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); onOpen() }}>
            View details
            <ArrowRight className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant={isComparing ? 'default' : 'outline'}
            onClick={(e) => { e.stopPropagation(); onCompare() }}
            className={cn(isComparing && 'bg-emerald-600 hover:bg-emerald-700')}
          >
            <ArrowLeftRight className="size-3.5" />
            {isComparing ? 'Comparing' : 'Compare'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// =================== University Detail ===================
function UniversityDetail({
  uni, isSaved, isComparing, isLoggedIn, onSave, onCompare, onWriteReview, onClose,
}: {
  uni: University
  isSaved: boolean
  isComparing: boolean
  isLoggedIn: boolean
  onSave: () => void
  onCompare: () => void
  onWriteReview: () => void
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = React.useState('overview')
  const [costDuration, setCostDuration] = React.useState(36)
  const [includeLiving, setIncludeLiving] = React.useState(true)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
          <div className="flex items-start gap-4 pr-10">
            <div className="size-16 rounded-xl bg-white/15 flex items-center justify-center text-4xl shrink-0">
              {countryFlag(uni.country)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{uni.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
                <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {uni.city}, {uni.country}</span>
                <a
                  href={uni.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="size-3.5" /> Visit website
                </a>
                {uni.avgRating !== null && (
                  <span className="flex items-center gap-1">
                    <Star className="size-3.5 fill-amber-300 text-amber-300" />
                    {uni.avgRating.toFixed(1)} ({uni.reviewCount})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button size="sm" variant="secondary" onClick={onSave} className="gap-2">
              <Heart className={cn('size-4', isSaved && 'fill-rose-500 text-rose-500')} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant={isComparing ? 'default' : 'secondary'}
              onClick={onCompare}
              className={cn('gap-2', isComparing && 'bg-emerald-700 hover:bg-emerald-800')}
            >
              <ArrowLeftRight className="size-4" />
              {isComparing ? 'In compare' : 'Add to compare'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-6">
            <TabsList className="bg-transparent h-12 p-0 gap-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">Overview</TabsTrigger>
              <TabsTrigger value="programs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">Programs ({uni.programs.length})</TabsTrigger>
              <TabsTrigger value="scholarships" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">Scholarships ({uni.scholarships.length})</TabsTrigger>
              <TabsTrigger value="cost" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">Cost Calculator</TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">Reviews ({uni.reviews.length})</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="overview" className="mt-0 space-y-4">
                <p className="text-sm leading-relaxed">{uni.descriptionEn}</p>
                <Separator />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={<DollarSign className="size-4" />} label="Cheapest program" value={formatUsd(uni.cheapestProgramTuition) + '/yr'} />
                  <StatCard icon={<DollarSign className="size-4" />} label="Living cost" value={formatUsd(uni.livingCostUsd) + '/yr'} />
                  <StatCard icon={<Users className="size-4" />} label="Intl students" value={uni.intlStudentPct + '%'} />
                  <StatCard icon={<TrendingUp className="size-4" />} label="Acceptance" value={uni.acceptanceRate !== null ? uni.acceptanceRate + '%' : 'N/A'} />
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Description (Arabic)</h4>
                  <p className="text-sm leading-relaxed text-right" dir="rtl" lang="ar">{uni.descriptionAr}</p>
                </div>
              </TabsContent>

              <TabsContent value="programs" className="mt-0 space-y-3">
                {uni.programs.map(p => (
                  <Card key={p.id} className="py-4">
                    <CardContent className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs capitalize">{p.degreeLevel}</Badge>
                            <Badge variant="secondary" className="text-xs">{p.field}</Badge>
                            <Badge variant="outline" className="text-xs">
                              <Languages className="size-3 mr-1" />
                              {p.language}
                            </Badge>
                          </div>
                          <h4 className="font-semibold">{p.name}</h4>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-700">{formatUsd(p.tuitionUsd)}</div>
                          <div className="text-xs text-muted-foreground">per year</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                        <span className="flex items-center gap-1"><Clock className="size-3" /> {p.durationMonths} months</span>
                        {p.deadline && <span className="flex items-center gap-1"><CalendarIcon className="size-3" /> Deadline: {p.deadline}</span>}
                      </div>
                      {p.entryReqs && (
                        <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
                          <strong>Entry requirements:</strong> {p.entryReqs}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="scholarships" className="mt-0 space-y-3">
                {uni.scholarships.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No scholarships listed.</div>
                ) : (
                  uni.scholarships.map(s => (
                    <Card key={s.id} className="py-4">
                      <CardContent>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold">{s.name}</h4>
                            <Badge variant="outline" className="mt-1 capitalize">{s.amountType}</Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-700">{formatUsd(s.amountUsd)}</div>
                            <div className="text-xs text-muted-foreground">{s.amountType === 'full' ? 'full coverage' : 'amount'}</div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{s.eligibility}</p>
                        {s.deadline && (
                          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <CalendarIcon className="size-3" /> Apply by: {s.deadline}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="cost" className="mt-0 space-y-4">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calculator className="size-4" /> Total Cost Calculator
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Estimate your total cost based on program duration. Tuition is per year; living costs are approximate.
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Program duration: {costDuration} months ({(costDuration / 12).toFixed(1)} years)</Label>
                    <Slider
                      value={[costDuration]}
                      onValueChange={(v) => setCostDuration(v[0])}
                      min={12}
                      max={72}
                      step={6}
                      className="mt-3"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1 year</span>
                      <span>6 years</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-living"
                      checked={includeLiving}
                      onCheckedChange={(v) => setIncludeLiving(v === true)}
                    />
                    <Label htmlFor="include-living" className="text-sm cursor-pointer">
                      Include living expenses ({formatUsd(uni.livingCostUsd)}/yr)
                    </Label>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tuition ({(costDuration / 12).toFixed(1)} years)</span>
                      <span className="font-medium">{formatUsd(Math.round(uni.cheapestProgramTuition * costDuration / 12))}</span>
                    </div>
                    {includeLiving && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Living ({(costDuration / 12).toFixed(1)} years)</span>
                        <span className="font-medium">{formatUsd(Math.round(uni.livingCostUsd * costDuration / 12))}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold">Total estimated cost</span>
                      <span className="text-2xl font-bold text-emerald-700">
                        {formatUsd(totalCost(
                          uni.cheapestProgramTuition,
                          includeLiving ? uni.livingCostUsd : 0,
                          costDuration
                        ))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-3">
                  <strong>Disclaimer:</strong> Costs are estimates based on annual tuition + living expenses. Currency conversion uses daily rates. Actual costs may vary by program and lifestyle. Always verify with the university directly.
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-0 space-y-4">
                {/* Write a review CTA */}
                <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div>
                    <div className="font-semibold text-sm">Share your experience</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {isLoggedIn
                        ? 'Help other MENA students by reviewing this university.'
                        : 'Sign in to write a review.'}
                    </div>
                  </div>
                  <Button onClick={onWriteReview} className="gap-2" size="sm">
                    <MessageSquarePlus className="size-4" />
                    Write a Review
                  </Button>
                </div>

                {uni.reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">✍️</div>
                    <h4 className="font-semibold mb-1">No reviews yet</h4>
                    <p className="text-sm text-muted-foreground">Be the first to share your experience at {uni.name}.</p>
                  </div>
                ) : (
                  <>
                    {uni.avgRating !== null && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-3xl font-bold">{uni.avgRating.toFixed(1)}</div>
                            <StarRating value={uni.avgRating} size={16} />
                            <div className="text-xs text-muted-foreground mt-1">{uni.reviewCount} review{uni.reviewCount > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <RatingBar label="Affordability" value={uni.reviews.reduce((s, r) => s + r.ratingAffordability, 0) / uni.reviews.length} />
                          <RatingBar label="Teaching quality" value={uni.reviews.reduce((s, r) => s + r.ratingTeaching, 0) / uni.reviews.length} />
                          <RatingBar label="Visa process" value={uni.reviews.reduce((s, r) => s + r.ratingVisa, 0) / uni.reviews.length} />
                          <RatingBar label="Safety" value={uni.reviews.reduce((s, r) => s + r.ratingSafety, 0) / uni.reviews.length} />
                          <RatingBar label="Social life" value={uni.reviews.reduce((s, r) => s + r.ratingSocial, 0) / uni.reviews.length} />
                        </div>
                      </div>
                    )}
                    {uni.reviews.map(r => (
                      <Card key={r.id} className="py-4">
                        <CardContent>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{r.userName}</span>
                                {r.verifiedEnrollment && (
                                  <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500 text-emerald-700">
                                    <CheckCircle2 className="size-3" /> Verified Student
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="size-3" /> {r.userCountry}
                              </div>
                            </div>
                            <StarRating value={r.ratingOverall} />
                          </div>
                          <p className="text-sm leading-relaxed my-3">{r.reviewText}</p>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {r.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                            <span>{new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                              <ThumbsUp className="size-3" /> Helpful ({r.helpfulCount})
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}

// =================== Comparison Table ===================
function ComparisonTable({ universities }: { universities: University[] }) {
  const rows: Array<{ label: string; render: (u: University) => React.ReactNode }> = [
    { label: 'Country', render: u => `${countryFlag(u.country)} ${u.country}` },
    { label: 'City', render: u => u.city },
    { label: 'Cheapest tuition (yr)', render: u => <span className="font-semibold text-emerald-700">{formatUsd(u.cheapestProgramTuition)}</span> },
    { label: 'Living cost (yr)', render: u => formatUsd(u.livingCostUsd) },
    { label: 'Total 3-yr cost', render: u => <span className="font-semibold">{formatUsd(totalCost(u.cheapestProgramTuition, u.livingCostUsd, 36))}</span> },
    { label: 'Intl student %', render: u => `${u.intlStudentPct}%` },
    { label: 'Acceptance rate', render: u => u.acceptanceRate !== null ? `${u.acceptanceRate}%` : 'N/A' },
    { label: 'Programs', render: u => `${u.programs.length} programs` },
    { label: 'Scholarships', render: u => `${u.scholarships.length} available` },
    { label: 'Reviews', render: u => u.reviewCount > 0 ? `${u.avgRating?.toFixed(1)} star (${u.reviewCount})` : 'None' },
    { label: 'Languages', render: u => [...new Set(u.programs.map(p => p.language))].join(', ') },
    { label: 'Fields', render: u => [...new Set(u.programs.map(p => p.field))].slice(0, 4).join(', ') },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-white z-10">
          <tr>
            <th className="text-left p-4 border-b font-semibold text-sm w-40">Metric</th>
            {universities.map(u => (
              <th key={u.id} className="text-left p-4 border-b font-semibold text-sm min-w-[200px]">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{countryFlag(u.country)}</span>
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
