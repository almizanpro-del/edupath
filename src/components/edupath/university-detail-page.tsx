'use client'

/**
 * University Detail Page — Institutional Design
 *
 * Layout based on the JUST mockup:
 * 1. Hero: navy bg with flag overlay, university name, tagline, Apply/Explore CTAs
 * 2. About + Quick Facts: two columns
 * 3. Programs: 3 cards with icon tiles + pill tags + View buttons
 * 4. Admission Requirements + Application Steps: light blue panel
 * 5. Student Life + Contact card
 * 6. Footer
 *
 * Color scheme: navy (#0e2038), blue (#2563eb), orange (#f97316), light blue panels
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Star, Heart, ArrowLeftRight, MapPin, Users, Globe,
  ExternalLink, Calculator, Mail, Send, Loader2, Building2,
  GraduationCap, Award, Plane, FileText, CheckCircle2, ChevronRight,
  ShieldCheck, TrendingUp, Clock, Phone, Search,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatUsd, formatUsdCompact, countryFlagUrl } from '@/lib/edupath'
import { calculateTotalCost } from '@/lib/financial'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { ReviewForm } from '@/components/edupath/review-form'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics-client'

// ─── Types ──────────────────────────────────────────────────────────────────

type Program = {
  id: string; name: string; degreeLevel: string; field: string
  durationMonths: number; language: string; tuitionUsd: number
  deadline: string | null; entryReqs: string | null
  applicationUrl?: string; applicationFeeUsd?: number
}
type Scholarship = {
  id: string; name: string; amountUsd: number; amountType: string
  eligibility: string; deadline: string | null; applicationUrl?: string
}
type Review = {
  id: string; userName: string; userCountry: string
  ratingOverall: number; ratingAffordability: number; ratingVisa: number
  ratingTeaching: number; ratingSafety: number; ratingSocial: number
  reviewText: string; helpfulCount: number; verifiedEnrollment: boolean
  tags: string[]; createdAt: string; isSample?: boolean
}
type University = {
  id: string; slug: string; name: string; country: string; city: string
  website: string; tuitionUsd: number; livingCostUsd: number
  intlStudentPct: number; acceptanceRate: number | null; currency: string
  logoUrl: string | null; descriptionEn: string; descriptionAr: string
  programs: Program[]; scholarships: Scholarship[]; reviews: Review[]
  avgRating: number | null; reviewCount: number; cheapestProgramTuition: number
  visaNotes?: string; dataSource?: string; dataConfidence?: string; lastVerifiedAt?: string | null
  claimedByUserId?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDomain(website: string): string | null {
  try {
    if (!website || website.includes('google.com/search')) return null
    const url = new URL(website)
    return url.hostname.replace(/^www\./, '')
  } catch { return null }
}

function getLogoUrl(uni: { logoUrl: string | null; website: string }): string | null {
  if (uni.logoUrl && !uni.logoUrl.includes('domain=www.google.com')) return uni.logoUrl
  const domain = getDomain(uni.website)
  if (domain) return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  return null
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'} />
      ))}
    </div>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  )
}

// ─── University Emblem component ────────────────────────────────────────────

/**
 * University emblem — uses the university's initials in a branded circle.
 * This is more reliable than favicons (which are often 16x16 and look
 * terrible when scaled up). The initials are displayed in a navy circle
 * with the university's first 2-3 letters, similar to how many
 * institutional apps display organizations.
 */
function UniversityEmblem({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  // Extract initials — first letter of first 2 words
  const initials = name
    .split(' ')
    .filter(w => w.length > 2 && !['of', 'the', 'and', 'for', 'university', 'University'].includes(w))
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || name.slice(0, 2).toUpperCase()

  const sizes = {
    sm: { box: 'size-10 rounded-xl', text: 'text-sm' },
    md: { box: 'size-12 rounded-xl', text: 'text-base' },
    lg: { box: 'size-16 rounded-2xl', text: 'text-xl' },
  }
  const s = sizes[size]

  return (
    <div className={cn(
      'flex items-center justify-center shrink-0 shadow-lg bg-gradient-to-br from-[#0e2038] to-[#1a3a5c] border border-white/20',
      s.box
    )}>
      <span className={cn(s.text, 'font-bold text-white tracking-tight')}>
        {initials}
      </span>
    </div>
  )
}

// ─── Sticky in-page nav sections ────────────────────────────────────────────

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'programs', label: 'Programs' },
  { id: 'costs', label: 'Costs' },
  { id: 'scholarships', label: 'Scholarships' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'visa', label: 'Visa & Life' },
] as const

// ─── Main Component ─────────────────────────────────────────────────────────

type Props = { uni: University }

export function UniversityDetailPage({ uni }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('Detail')
  const tToast = useTranslations('Toast')
  const locale = useLocale()

  const [costDuration, setCostDuration] = React.useState(36)
  const [includeLiving, setIncludeLiving] = React.useState(true)
  const [isSaved, setIsSaved] = React.useState(false)
  const [isComparing, setIsComparing] = React.useState(false)
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [reviewFormOpen, setReviewFormOpen] = React.useState(false)
  const [contactOpen, setContactOpen] = React.useState(false)
  const [showStickyCta, setShowStickyCta] = React.useState(false)
  const [reviews, setReviews] = React.useState<Review[]>(uni.reviews)
  const [activeSection, setActiveSection] = React.useState<string>('about')

  React.useEffect(() => {
    track('university_view', { universityId: uni.id, metadata: { slug: uni.slug, name: uni.name } })
  }, [uni.id, uni.slug, uni.name])

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch('/api/me').then(r => r.ok ? r.json() : { profile: null })
          .then(data => { if (data.profile) setProfile(data.profile) }).catch(() => {})
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setProfile(null); setIsSaved(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!profile) return
    fetch('/api/saved-lists').then(r => r.ok ? r.json() : { universities: [] })
      .then(data => { const saved = new Set<string>((data.universities ?? []).map((u: { id: string }) => u.id)); setIsSaved(saved.has(uni.id)) })
      .catch(() => {})
  }, [profile, uni.id])

  React.useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(entry => { if (entry.isIntersecting) setActiveSection(entry.target.id) }) },
      { rootMargin: '-80px 0px -60% 0px' }
    )
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const openContact = () => { setContactOpen(true); track('contact_open', { universityId: uni.id }) }

  const handleSave = async () => {
    if (!profile) { toast({ title: tToast('signInToSave'), description: tToast('signInToSaveDesc') }); setAuthModalOpen(true); return }
    const wasSaved = isSaved; setIsSaved(!wasSaved)
    track(wasSaved ? 'unsave' : 'save', { universityId: uni.id })
    try {
      const res = await fetch('/api/saved-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ universityId: uni.id }) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
      toast({ title: data.action === 'saved' ? tToast('savedToList') : tToast('removedFromSaved'), description: uni.name })
    } catch { setIsSaved(wasSaved); toast({ title: tToast('failedToSave'), variant: 'destructive' }) }
  }

  const handleCompare = () => {
    if (isComparing) { setIsComparing(false); toast({ title: tToast('compareRemoved'), description: uni.name }) }
    else { setIsComparing(true); track('compare', { universityId: uni.id }); toast({ title: tToast('compareAdded'), description: uni.name }) }
  }

  const openReviewForm = () => {
    if (!profile) { toast({ title: tToast('signInToReview'), description: tToast('signInToReviewDesc') }); setAuthModalOpen(true); return }
    setReviewFormOpen(true)
  }

  const handleReviewSubmitted = async () => {
    try { const res = await fetch(`/api/reviews?universityId=${uni.id}`); if (!res.ok) return; const data = await res.json(); if (data.reviews) setReviews(data.reviews) } catch {}
  }

  const realReviews = reviews.filter(r => !r.isSample)
  const avgRating = realReviews.length > 0 ? realReviews.reduce((s, r) => s + r.ratingOverall, 0) / realReviews.length : null
  const isAr = locale === 'ar'
  const isClaimed = Boolean(uni.claimedByUserId)
  const isVerified = uni.dataConfidence === 'high' || isClaimed
  const annualTuition = uni.cheapestProgramTuition || uni.tuitionUsd
  const annualLiving = uni.livingCostUsd
  const annualTotal = annualTuition + annualLiving
  // logoUrl removed — using initials-based emblem instead
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  // Program icon mapping
  const programIcon = (field: string) => {
    const f = field.toLowerCase()
    if (f.includes('engineer') || f.includes('computer') || f.includes('tech')) return '⚙️'
    if (f.includes('medic') || f.includes('pharmac') || f.includes('health') || f.includes('dental')) return '🧪'
    if (f.includes('business') || f.includes('manage') || f.includes('admin')) return '📊'
    if (f.includes('law')) return '⚖️'
    if (f.includes('art') || f.includes('design') || f.includes('architect')) return '🎨'
    if (f.includes('science') || f.includes('bio') || f.includes('chem') || f.includes('physic')) return '🔬'
    return '📚'
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* ─── Top bar (navy) ─── */}
      <header className="sticky top-0 z-40 bg-[#0e2038] text-white">
        <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm font-medium hover:text-blue-300 transition-colors">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{t('back') || 'Back'}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <button onClick={handleCompare} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', isComparing ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-white/80')}>
              <ArrowLeftRight className="size-3.5" />
              <span className="hidden sm:inline">{isComparing ? t('inCompare') : t('addToCompare')}</span>
            </button>
            <button onClick={handleSave} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', isSaved ? 'bg-rose-500/20 text-rose-300' : 'hover:bg-white/10 text-white/80')}>
              <Heart className={cn('size-3.5', isSaved && 'fill-rose-500 text-rose-400')} />
              <span className="hidden sm:inline">{isSaved ? t('saved') : t('save')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero (navy with flag background) ─── */}
      <div className="relative bg-[#0e2038] text-white overflow-hidden">
        {/* Country flag as background — right side, faded */}
        <div className="absolute inset-0 overflow-hidden">
          <img src={countryFlagUrl(uni.country, 1280)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e2038] via-[#0e2038]/90 to-[#0e2038]/40" />
        </div>

        <div className="relative container mx-auto max-w-6xl px-4 py-10 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-10">
            {/* Left: identity */}
            <div className="flex-1 min-w-0">
              {/* Emblem + location */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <UniversityEmblem name={uni.name} size="lg" />
                <span className="text-sm text-white/70 flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {uni.city}, {uni.country}
                </span>
                {isClaimed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-medium text-emerald-200">
                    <ShieldCheck className="size-3" />
                    {isAr ? 'موثق' : 'Verified'}
                  </span>
                )}
              </div>
              {/* University name */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-3 drop-shadow-lg">
                {uni.name}
              </h1>
              {/* Tagline / description excerpt */}
              <p className="text-base md:text-lg text-white/60 mb-6 max-w-2xl leading-relaxed">
                {uni.descriptionEn.slice(0, 150)}
                {uni.descriptionEn.length > 150 ? '…' : ''}
              </p>
              {/* CTAs — orange Apply + outlined Explore */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={openContact}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-lg shadow-orange-600/20 transition-colors"
                >
                  <Mail className="size-4" />
                  {t('contact.ctaShort')}
                  <ChevronRight className="size-4" />
                </button>
                <a
                  href={uni.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/30 hover:bg-white/10 text-white font-semibold text-sm transition-colors"
                >
                  <ExternalLink className="size-4" />
                  {t('visitWebsite')}
                  <ChevronRight className="size-4" />
                </a>
              </div>
            </div>

            {/* Right: price card (glassmorphic) */}
            <div className="shrink-0 w-full md:w-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-5 md:w-64">
                <div className="mb-1">
                  <span className="text-[11px] text-white/50 uppercase tracking-wider font-medium">
                    {isAr ? 'التكلفة السنوية' : 'Annual cost from'}
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {formatUsdCompact(annualTotal)}
                  <span className="text-sm font-medium text-white/50 ml-1">/yr</span>
                </div>
                <div className="text-xs text-white/50 mb-4">
                  {formatUsdCompact(annualTuition)} tuition + {formatUsdCompact(annualLiving)} living
                </div>
                {!isVerified && (
                  <div className="text-[10px] text-amber-300/80 mb-3 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-amber-400" />
                    {isAr ? 'بيانات تقديرية' : 'Estimated — verify with university'}
                  </div>
                )}
                {/* Quick stats inline */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Users className="size-3.5" />
                    {uni.intlStudentPct}% {isAr ? 'طلاب دوليون' : 'intl students'}
                  </div>
                  {uni.acceptanceRate !== null && (
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <TrendingUp className="size-3.5" />
                      {uni.acceptanceRate}% {isAr ? 'نسبة القبول' : 'acceptance rate'}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <GraduationCap className="size-3.5" />
                    {uni.programs.length} {isAr ? 'برامج' : 'programs'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sticky in-page nav ─── */}
      <div className="sticky top-14 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b dark:border-slate-800">
        <div className="container mx-auto max-w-6xl px-4">
          <nav className="flex items-center gap-1 overflow-x-auto py-1.5" style={{ scrollbarWidth: 'none' }}>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  activeSection === s.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="container mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-12">

        {/* ─── About + Quick Facts ─── */}
        <section id="about" className="scroll-mt-28">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* About — 2/3 width */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-4 dark:text-white text-[#0e2038]">
                {isAr ? 'نبذة' : 'About'}
              </h2>
              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300 mb-4">
                {uni.descriptionEn}
              </p>
              {uni.descriptionAr && (
                <div className="mt-6 pt-6 border-t dark:border-slate-800">
                  <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300 text-right" dir="rtl" lang="ar">
                    {uni.descriptionAr}
                  </p>
                </div>
              )}
            </div>
            {/* Quick Facts — 1/3 width, light gray card */}
            <div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6">
                <h3 className="font-bold mb-4 text-[#0e2038] dark:text-white">
                  {isAr ? 'حقائق سريعة' : 'Quick Facts'}
                </h3>
                <div className="space-y-3">
                  <FactRow icon={<MapPin className="size-4" />} label={isAr ? 'الموقع' : 'Location'} value={`${uni.city}, ${uni.country}`} />
                  <FactRow icon={<Users className="size-4" />} label={isAr ? 'طلاب دوليون' : 'Intl. students'} value={`${uni.intlStudentPct}%`} />
                  <FactRow icon={<TrendingUp className="size-4" />} label={isAr ? 'نسبة القبول' : 'Acceptance rate'} value={uni.acceptanceRate !== null ? `${uni.acceptanceRate}%` : '—'} />
                  <FactRow icon={<GraduationCap className="size-4" />} label={isAr ? 'عدد البرامج' : 'Programs'} value={`${uni.programs.length}`} />
                  <FactRow icon={<Award className="size-4" />} label={isAr ? 'المنح' : 'Scholarships'} value={`${uni.scholarships.length}`} />
                  <FactRow icon={<Globe className="size-4" />} label={isAr ? 'لغة التدريس' : 'Languages'} value={[...new Set(uni.programs.map(p => p.language))].join(', ') || '—'} />
                  <FactRow icon={<Clock className="size-4" />} label={isAr ? 'أقصر برنامج' : 'Shortest program'} value={uni.programs.length > 0 ? `${Math.min(...uni.programs.map(p => p.durationMonths))} months` : '—'} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Programs ─── */}
        <section id="programs" className="scroll-mt-28">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-[#0e2038] dark:text-white">
              {isAr ? 'البرامج' : 'Programs'}
              <span className="text-slate-400 font-normal text-lg ml-2">({uni.programs.length})</span>
            </h2>
            <a href={uni.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              {isAr ? 'كل البرامج' : 'View all programs'}
              <ChevronRight className="size-4" />
            </a>
          </div>
          {uni.programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{isAr ? 'لا برامج متاحة' : 'No programs listed yet.'}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {uni.programs.map(p => (
                <div key={p.id} className="border dark:border-slate-800 rounded-xl p-5 hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                  {/* Icon + title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-xl shrink-0">
                      {programIcon(p.field)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold dark:text-white text-sm leading-tight">{p.name}</h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{p.field}</p>
                    </div>
                  </div>
                  {/* Description */}
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {p.entryReqs ? p.entryReqs.slice(0, 100) + '…' : `${p.degreeLevel} · ${p.durationMonths} months · ${p.language}`}
                  </p>
                  {/* Pill tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300 capitalize">
                      {p.degreeLevel}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {formatUsdCompact(p.tuitionUsd)}/yr
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {p.durationMonths} {isAr ? 'شهر' : 'mo'}
                    </span>
                  </div>
                  {/* View button */}
                  <a
                    href={p.applicationUrl || uni.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors w-full justify-center"
                  >
                    {p.applicationUrl ? (isAr ? 'قدم الآن' : 'Apply Now') : (isAr ? 'زيارة الموقع' : 'Visit Website')}
                    <ChevronRight className="size-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── Costs ─── */}
        <section id="costs" className="scroll-mt-28">
          <h2 className="text-2xl font-bold mb-5 text-[#0e2038] dark:text-white">
            {isAr ? 'حاسبة التكلفة' : 'Cost Calculator'}
          </h2>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 max-w-2xl">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium dark:text-slate-200">
                  {isAr ? `المدة: ${costDuration} شهر` : `Duration: ${costDuration} months (${(costDuration / 12).toFixed(1)} years)`}
                </Label>
              </div>
              <Slider value={[costDuration]} onValueChange={(v) => setCostDuration(v[0])} min={12} max={72} step={6} />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>1 {isAr ? 'سنة' : 'year'}</span>
                <span>6 {isAr ? 'سنوات' : 'years'}</span>
              </div>
            </div>
            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <Checkbox checked={includeLiving} onCheckedChange={(v) => setIncludeLiving(v === true)} />
              <span className="text-sm dark:text-slate-200">
                {isAr ? `تضمين تكلفة المعيشة (${formatUsd(annualLiving)}/سنة)` : `Include living costs (${formatUsd(annualLiving)}/yr)`}
              </span>
            </label>
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isAr ? 'الرسوم' : 'Tuition'} ({(costDuration / 12).toFixed(1)} {isAr ? 'سنة' : 'yr'})</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{formatUsd(Math.round(annualTuition * costDuration / 12))}</span>
              </div>
              {includeLiving && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isAr ? 'المعيشة' : 'Living'} ({(costDuration / 12).toFixed(1)} {isAr ? 'سنة' : 'yr'})</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">{formatUsd(Math.round(annualLiving * costDuration / 12))}</span>
                </div>
              )}
            </div>
            <div className="bg-[#0e2038] rounded-xl p-4 text-white">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm uppercase tracking-wider">{isAr ? 'الإجمالي' : 'Total'}</span>
                <span className="text-2xl font-bold">
                  {(() => { const total = calculateTotalCost(annualTuition, includeLiving ? annualLiving : 0, costDuration); return total !== null ? formatUsd(total) : '—' })()}
                </span>
              </div>
            </div>
            {!isVerified && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                {isAr ? '⚠️ البيانات المالية تقديرية. يرجى التحقق من الموقع الرسمي.' : '⚠️ Financial data is estimated. Verify with the official university website.'}
              </p>
            )}
          </div>
        </section>

        {/* ─── Scholarships ─── */}
        <section id="scholarships" className="scroll-mt-28">
          <h2 className="text-2xl font-bold mb-5 text-[#0e2038] dark:text-white">
            {isAr ? 'المنح' : 'Scholarships'}
            <span className="text-slate-400 font-normal text-lg ml-2">({uni.scholarships.length})</span>
          </h2>
          {uni.scholarships.length === 0 ? (
            <div className="text-center py-12 border rounded-2xl dark:border-slate-800">
              <Award className="size-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{isAr ? 'لا منح متاحة حالياً' : 'No scholarships listed yet.'}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {uni.scholarships.map(s => (
                <div key={s.id} className="border dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                        <Award className="size-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="font-semibold dark:text-white text-sm">{s.name}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatUsdCompact(s.amountUsd)}</div>
                      <Badge variant="outline" className="text-[9px] capitalize">{s.amountType}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{s.eligibility}</p>
                  {s.deadline && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <CalendarIcon className="size-3" />
                      {isAr ? 'آخر موعد' : 'Apply by'}: {s.deadline}
                    </div>
                  )}
                  {s.applicationUrl && (
                    <a href={s.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium transition-colors">
                      <ExternalLink className="size-3" />
                      {isAr ? 'تقدم الآن' : 'Apply Now'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── Reviews ─── */}
        <section id="reviews" className="scroll-mt-28">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-[#0e2038] dark:text-white">
              {isAr ? 'المراجعات' : 'Reviews'}
              {avgRating !== null && <span className="text-slate-400 font-normal text-lg ml-2">({realReviews.length})</span>}
            </h2>
            <Button variant="outline" size="sm" onClick={openReviewForm} className="gap-2">
              <Star className="size-4" />
              {isAr ? 'اكتب مراجعة' : 'Write a review'}
            </Button>
          </div>
          {avgRating !== null && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-5 mb-5 flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{avgRating.toFixed(1)}</div>
                <StarRow value={avgRating} size={16} />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {isAr ? `بناءً على ${realReviews.length} مراجعة` : `Based on ${realReviews.length} ${realReviews.length === 1 ? 'review' : 'reviews'}`}
              </div>
            </div>
          )}
          {realReviews.length === 0 ? (
            <div className="text-center py-12 border rounded-2xl dark:border-slate-800">
              <Star className="size-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-1 dark:text-white">{isAr ? 'كن أول من يراجع' : 'Be the first to review'}</h3>
              <p className="text-sm text-muted-foreground mb-4">{isAr ? 'شارك تجربتك لمساعدة الطلاب الآخرين' : 'Share your experience to help other students'}</p>
              <Button onClick={openReviewForm} size="sm">{isAr ? 'اكتب مراجعة' : 'Write a review'}</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {realReviews.map(r => (
                <div key={r.id} className="border dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold dark:text-white text-sm">{r.userName}</div>
                      <div className="text-xs text-muted-foreground">{r.userCountry}</div>
                    </div>
                    <div className="text-right">
                      <StarRow value={r.ratingOverall} />
                      <div className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{r.reviewText}</p>
                  {r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {r.tags.map(tag => <Badge key={tag} variant="outline" className="text-[9px]">{tag}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── Visa & Life ─── */}
        <section id="visa" className="scroll-mt-28">
          <h2 className="text-2xl font-bold mb-5 text-[#0e2038] dark:text-white">
            {isAr ? 'التأشيرة والحياة' : 'Visa & Student Life'}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                  <Plane className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold dark:text-white text-sm">{isAr ? 'نظرة على التأشيرة' : 'Visa Overview'}</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {uni.visaNotes || (isAr
                  ? 'تحقق من أقرب سفارة لمتطلبات تأشيرة الطالب. عادة ما يتطلب: خط قبول، جواز سفر، إثبات مالي، تأمين صحي.'
                  : 'Check with the nearest embassy for student visa requirements. Typically requires: acceptance letter, valid passport, financial proof, and health insurance.')}
              </p>
            </div>
            <div className="border dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
                  <FileText className="size-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold dark:text-white text-sm">{isAr ? 'قائمة التقديم' : 'Application Checklist'}</h3>
              </div>
              <ul className="space-y-1.5">
                {[
                  isAr ? 'خط قبول جامعي' : 'University acceptance letter',
                  isAr ? 'جواز سفر ساري (6+ أشهر)' : 'Valid passport (6+ months)',
                  isAr ? 'إثبات مالي' : 'Financial proof',
                  isAr ? 'تأمين صحي' : 'Health insurance',
                  isAr ? 'شهادة لغة (IELTS/TOEFL)' : 'Language certificate (IELTS/TOEFL)',
                  isAr ? 'كشوف درجات موثقة' : 'Authenticated transcripts',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
            {isAr ? '⚠️ هذه معلومات عامة. تحقق دائماً من السفارة المعنية للمتطلبات الحالية.' : '⚠️ This is general guidance. Always verify current requirements with the relevant embassy.'}
          </div>
        </section>

        {/* ─── Claim link (discreet) ─── */}
        <div className="pt-8 border-t dark:border-slate-800 text-center">
          <p className="text-xs text-muted-foreground mb-2">{isAr ? 'هل تمثل هذه الجامعة؟' : 'Represent this university?'}</p>
          <button onClick={() => router.push(`/claim/${uni.slug}`)} className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
            <Building2 className="size-3.5" />
            {isAr ? 'اطلب إدارة الملف' : 'Claim this profile'}
          </button>
        </div>
      </div>

      {/* ─── Mobile sticky CTA bar ─── */}
      <AnimatePresence>
        {showStickyCta && !contactOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white dark:bg-slate-900 border-t dark:border-slate-800 p-3 shadow-2xl"
          >
            <button onClick={openContact} className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-colors">
              <Mail className="size-4" />
              {t('contact.ctaShort')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Contact modal ─── */}
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} universityId={uni.id} universityName={uni.name} profile={profile} />

      {/* ─── Other modals ─── */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
      <ReviewForm open={reviewFormOpen} onClose={() => setReviewFormOpen(false)} universityId={uni.id} universityName={uni.name} onSubmitted={handleReviewSubmitted} />
    </div>
  )
}

// ─── FactRow component ──────────────────────────────────────────────────────

function FactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-[#0e2038] dark:text-blue-400 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold dark:text-white">{value}</span>
      </div>
    </div>
  )
}

// ─── Contact Dialog ─────────────────────────────────────────────────────────

function ContactDialog({ open, onOpenChange, universityId, universityName, profile }: { open: boolean; onOpenChange: (v: boolean) => void; universityId: string; universityName: string; profile: UserProfile | null }) {
  const { toast } = useToast()
  const t = useTranslations('Detail.contact')
  const [name, setName] = React.useState(profile?.name ?? '')
  const [email, setEmail] = React.useState('')
  const [country, setCountry] = React.useState(profile?.country ?? '')
  const [gpa, setGpa] = React.useState('')
  const [field, setField] = React.useState(profile?.fieldOfInterest ?? '')
  const [message, setMessage] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  React.useEffect(() => { if (profile) { setName(profile.name); setCountry(profile.country); setField(profile.fieldOfInterest ?? '') } }, [profile])
  React.useEffect(() => { if (!open) { const t = setTimeout(() => setSubmitted(false), 200); return () => clearTimeout(t) } }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !message) { toast({ title: t('fillRequired'), variant: 'destructive' }); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ universityId, studentName: name, studentEmail: email, country, gpa, field, message }) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
      setSubmitted(true); setMessage('')
      toast({ title: t('messageSent'), description: t('messageSentDesc', { name: universityName }) })
    } catch (err) { toast({ title: t('failedToSend'), description: err instanceof Error ? err.message : t('tryAgain'), variant: 'destructive' }) }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-lg gap-0">
        {submitted ? (
          <div className="p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }} className="size-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-8 text-orange-600 dark:text-orange-400" />
            </motion.div>
            <h3 className="text-xl font-bold mb-2 dark:text-white">{t('messageSent')}</h3>
            <p className="text-sm text-muted-foreground mb-6 dark:text-slate-400">{t('messageSentDesc', { name: universityName })}</p>
            <Button onClick={() => onOpenChange(false)} className="bg-orange-500 hover:bg-orange-600 text-white">OK</Button>
          </div>
        ) : (
          <>
            <div className="bg-[#0e2038] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <Mail className="size-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t('title', { name: universityName })}</h3>
                  <p className="text-xs text-white/60">{t('description')}</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="c-name" className="text-xs dark:text-slate-300">{t('yourName')} *</Label><Input id="c-name" value={name} onChange={e => setName(e.target.value)} required className="dark:bg-slate-800 dark:border-slate-700" /></div>
                  <div className="space-y-1.5"><Label htmlFor="c-email" className="text-xs dark:text-slate-300">{t('email')} *</Label><Input id="c-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="dark:bg-slate-800 dark:border-slate-700" /></div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="c-country" className="text-xs dark:text-slate-300">{t('country')}</Label><Input id="c-country" value={country} onChange={e => setCountry(e.target.value)} className="dark:bg-slate-800 dark:border-slate-700" /></div>
                  <div className="space-y-1.5"><Label htmlFor="c-gpa" className="text-xs dark:text-slate-300">{t('gpa')}</Label><Input id="c-gpa" type="number" step="0.1" placeholder="3.5" value={gpa} onChange={e => setGpa(e.target.value)} className="dark:bg-slate-800 dark:border-slate-700" /></div>
                  <div className="space-y-1.5"><Label htmlFor="c-field" className="text-xs dark:text-slate-300">{t('fieldOfInterest')}</Label><Input id="c-field" value={field} onChange={e => setField(e.target.value)} className="dark:bg-slate-800 dark:border-slate-700" /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="c-msg" className="text-xs dark:text-slate-300">{t('yourMessage')} *</Label><Textarea id="c-msg" rows={4} placeholder={t('messagePlaceholder')} value={message} onChange={e => setMessage(e.target.value)} required maxLength={2000} className="dark:bg-slate-800 dark:border-slate-700 resize-none" /></div>
                <Button type="submit" className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {submitting ? t('submitting') : t('sendInquiry')}
                </Button>
              </form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
