'use client'

/**
 * University Detail Page — Exact mockup fork
 *
 * Layout based on the JUST university mockup:
 * 1. Navy top bar with university name + nav
 * 2. Hero: navy with flag bg, H1 + tagline + orange Apply + outlined Explore
 * 3. About + Quick Facts: two columns, gray facts card
 * 4. Programs: 3 cards with icon tiles, pill tags, View buttons
 * 5. Admissions: light blue panel, requirements + 4-step process
 * 6. Student Life: 4 cards + contact card
 * 7. Footer: navy bar
 *
 * Colors: Navy #0B2545, Blue #2563EB, Orange #F97316, Light blue #EAF2FE
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Star, Heart, ArrowLeftRight, MapPin, Users, Globe,
  ExternalLink, Calculator, Mail, Send, Loader2, Building2,
  GraduationCap, Award, Plane, FileText, CheckCircle2, ChevronRight,
  ShieldCheck, TrendingUp, Clock, Phone, Search, Home,
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

// ─── Colors ─────────────────────────────────────────────────────────────────

const NAVY = '#0B2545'
const BLUE = '#2563EB'
const ORANGE = '#F97316'
const LIGHT_BLUE_PANEL = '#EAF2FE'
const LIGHT_BLUE_ICON = '#DBEAFE'
const LIGHT_GRAY = '#F8FAFC'
const BODY_GRAY = '#64748B'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(w => w.length > 2 && !['of', 'the', 'and', 'for', 'University', 'university'].includes(w))
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || name.slice(0, 2).toUpperCase()
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
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

// ─── Emblem ─────────────────────────────────────────────────────────────────

function Emblem({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = getInitials(name)
  const sizes = {
    sm: 'size-9 rounded-lg text-xs',
    md: 'size-10 rounded-xl text-sm',
    lg: 'size-12 rounded-xl text-base',
  }
  return (
    <div
      className={cn('flex items-center justify-center shrink-0 shadow-md', sizes[size])}
      style={{ background: `linear-gradient(135deg, ${NAVY}, #1a3a6c)`, border: '1px solid rgba(255,255,255,0.2)' }}
    >
      <span className="font-bold text-white tracking-tight">{initials}</span>
    </div>
  )
}

// ─── Sticky nav ─────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'programs', label: 'Programs' },
  { id: 'costs', label: 'Costs' },
  { id: 'scholarships', label: 'Scholarships' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'admissions', label: 'Admissions' },
] as const

// ─── Main ───────────────────────────────────────────────────────────────────

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

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

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
    <div className="min-h-screen" style={{ background: '#fff' }}>
      {/* ─── Top nav bar (navy) ─── */}
      <header className="sticky top-0 z-40 text-white" style={{ background: NAVY }}>
        <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          {/* Left: back + emblem + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => router.push('/')} className="hover:text-blue-300 transition-colors shrink-0">
              <ArrowLeft className="size-5" />
            </button>
            <Emblem name={uni.name} size="sm" />
            <span className="hidden sm:block text-sm font-bold truncate max-w-[200px]">{uni.name}</span>
          </div>
          {/* Right: actions */}
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
      <div className="relative text-white overflow-hidden" style={{ background: NAVY }}>
        {/* Country flag as background — right side */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={countryFlagUrl(uni.country, 1280)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${NAVY} 0%, ${NAVY}dd 40%, ${NAVY}55 100%)` }} />
        </div>

        <div className="relative container mx-auto max-w-6xl px-4 py-12 md:py-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-white/50 mb-6">
            <Home className="size-3" />
            <button onClick={() => router.push('/')} className="hover:text-white">EduPath</button>
            <span>/</span>
            <span className="text-white/70">Universities</span>
            <span>/</span>
            <span className="text-white">{uni.country}</span>
          </div>

          {/* University name + tagline */}
          <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-10">
            <div className="flex-1 min-w-0">
              {/* Location */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-sm text-white/60 flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {uni.city}, {uni.country}
                </span>
                {isClaimed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(52,211,153,0.3)', color: '#6ee7b7' }}>
                    <ShieldCheck className="size-3" />
                    {isAr ? 'موثق' : 'Verified'}
                  </span>
                )}
              </div>
              {/* H1 */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-3" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                {uni.name}
              </h1>
              {/* Tagline */}
              <p className="text-base md:text-lg text-white/50 mb-6 max-w-2xl leading-relaxed">
                {uni.descriptionEn.slice(0, 150)}{uni.descriptionEn.length > 150 ? '…' : ''}
              </p>
              {/* CTA buttons — orange + outlined */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={openContact}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-sm shadow-lg transition-colors"
                  style={{ background: ORANGE, color: '#fff' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#ea6a0f'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ORANGE}
                >
                  <Mail className="size-4" />
                  {t('contact.ctaShort')}
                  <ChevronRight className="size-4" />
                </button>
                <a
                  href={uni.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-sm transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#fff' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <ExternalLink className="size-4" />
                  {t('visitWebsite')}
                  <ChevronRight className="size-4" />
                </a>
              </div>
            </div>

            {/* Right: price card */}
            <div className="shrink-0 w-full md:w-auto">
              <div className="rounded-2xl p-5 md:w-64" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}>
                <div className="mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {isAr ? 'التكلفة السنوية' : 'Annual cost from'}
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {formatUsdCompact(annualTotal)}
                  <span className="text-sm font-medium ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>/yr</span>
                </div>
                <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {formatUsdCompact(annualTuition)} tuition + {formatUsdCompact(annualLiving)} living
                </div>
                {!isVerified && (
                  <div className="text-[10px] mb-3 flex items-center gap-1" style={{ color: 'rgba(251,191,36,0.8)' }}>
                    <span className="size-1.5 rounded-full" style={{ background: '#fbbf24' }} />
                    {isAr ? 'بيانات تقديرية' : 'Estimated — verify with university'}
                  </div>
                )}
                <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <Users className="size-3.5" />
                    {uni.intlStudentPct}% {isAr ? 'طلاب دوليون' : 'intl students'}
                  </div>
                  {uni.acceptanceRate !== null && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <TrendingUp className="size-3.5" />
                      {uni.acceptanceRate}% {isAr ? 'نسبة القبول' : 'acceptance rate'}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
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
      <div className="sticky top-14 z-30 bg-white border-b" style={{ backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.95)' }}>
        <div className="container mx-auto max-w-6xl px-4">
          <nav className="flex items-center gap-1 overflow-x-auto py-1.5" style={{ scrollbarWidth: 'none' }}>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn('px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors', activeSection === s.id ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')}
                style={activeSection === s.id ? { background: BLUE } : {}}
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
            {/* About */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-4" style={{ color: NAVY, fontFamily: 'Poppins, system-ui, sans-serif' }}>
                {isAr ? 'نبذة' : 'About'}
              </h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: BODY_GRAY }}>
                {uni.descriptionEn}
              </p>
              {uni.descriptionAr && (
                <div className="mt-6 pt-6 border-t" style={{ borderColor: '#e2e8f0' }}>
                  <p className="text-sm leading-relaxed text-right" dir="rtl" lang="ar" style={{ color: BODY_GRAY }}>
                    {uni.descriptionAr}
                  </p>
                </div>
              )}
            </div>
            {/* Quick Facts card */}
            <div>
              <div className="rounded-xl p-5" style={{ background: LIGHT_GRAY, border: '1px solid #e2e8f0' }}>
                <h3 className="font-bold mb-4 text-base" style={{ color: NAVY }}>
                  {isAr ? 'حقائق سريعة' : 'Quick Facts'}
                </h3>
                <div className="space-y-3">
                  <FactRow icon={<MapPin className="size-4" />} label={isAr ? 'الموقع' : 'Location'} value={`${uni.city}, ${uni.country}`} />
                  <FactRow icon={<Users className="size-4" />} label={isAr ? 'طلاب دوليون' : 'Intl. students'} value={`${uni.intlStudentPct}%`} />
                  <FactRow icon={<TrendingUp className="size-4" />} label={isAr ? 'نسبة القبول' : 'Acceptance rate'} value={uni.acceptanceRate !== null ? `${uni.acceptanceRate}%` : '—'} />
                  <FactRow icon={<GraduationCap className="size-4" />} label={isAr ? 'البرامج' : 'Programs'} value={`${uni.programs.length}`} />
                  <FactRow icon={<Award className="size-4" />} label={isAr ? 'المنح' : 'Scholarships'} value={`${uni.scholarships.length}`} />
                  <FactRow icon={<Globe className="size-4" />} label={isAr ? 'اللغة' : 'Languages'} value={[...new Set(uni.programs.map(p => p.language))].join(', ') || '—'} />
                  <FactRow icon={<Clock className="size-4" />} label={isAr ? 'أقصر برنامج' : 'Shortest program'} value={uni.programs.length > 0 ? `${Math.min(...uni.programs.map(p => p.durationMonths))} mo` : '—'} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Programs ─── */}
        <section id="programs" className="scroll-mt-28">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold" style={{ color: NAVY }}>
              {isAr ? 'البرامج' : 'Programs'}
              <span className="font-normal text-base ml-2" style={{ color: '#94a3b8' }}>({uni.programs.length})</span>
            </h2>
            <a href={uni.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex items-center gap-1" style={{ color: BLUE }}>
              {isAr ? 'كل البرامج' : 'View all programs'}
              <ChevronRight className="size-4" />
            </a>
          </div>
          {uni.programs.length === 0 ? (
            <p className="text-sm" style={{ color: BODY_GRAY }}>{isAr ? 'لا برامج متاحة' : 'No programs listed yet.'}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {uni.programs.map(p => (
                <div key={p.id} className="rounded-xl p-5 transition-shadow hover:shadow-lg" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                  {/* Icon + title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="size-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: LIGHT_BLUE_ICON }}>
                      {programIcon(p.field)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight" style={{ color: NAVY }}>{p.name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: BLUE }}>{p.field}</p>
                    </div>
                  </div>
                  {/* Description */}
                  <p className="text-xs mb-4 line-clamp-2" style={{ color: BODY_GRAY }}>
                    {p.entryReqs ? p.entryReqs.slice(0, 100) + '…' : `${p.degreeLevel} · ${p.durationMonths} months · ${p.language}`}
                  </p>
                  {/* Pill tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize" style={{ border: '1px solid #e2e8f0', color: BODY_GRAY }}>{p.degreeLevel}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ border: '1px solid #e2e8f0', color: BODY_GRAY }}>{formatUsdCompact(p.tuitionUsd)}/yr</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ border: '1px solid #e2e8f0', color: BODY_GRAY }}>{p.durationMonths} {isAr ? 'شهر' : 'mo'}</span>
                  </div>
                  {/* View button */}
                  <a
                    href={p.applicationUrl || uni.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium w-full justify-center transition-colors"
                    style={{ background: BLUE, color: '#fff' }}
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
          <h2 className="text-xl font-bold mb-5" style={{ color: NAVY }}>
            {isAr ? 'حاسبة التكلفة' : 'Cost Calculator'}
          </h2>
          <div className="rounded-xl p-6 max-w-2xl" style={{ background: LIGHT_GRAY }}>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">
                  {isAr ? `المدة: ${costDuration} شهر` : `Duration: ${costDuration} months (${(costDuration / 12).toFixed(1)} years)`}
                </Label>
              </div>
              <Slider value={[costDuration]} onValueChange={(v) => setCostDuration(v[0])} min={12} max={72} step={6} />
              <div className="flex justify-between text-xs mt-2" style={{ color: BODY_GRAY }}>
                <span>1 {isAr ? 'سنة' : 'year'}</span>
                <span>6 {isAr ? 'سنوات' : 'years'}</span>
              </div>
            </div>
            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <Checkbox checked={includeLiving} onCheckedChange={(v) => setIncludeLiving(v === true)} />
              <span className="text-sm">{isAr ? `تضمين تكلفة المعيشة (${formatUsd(annualLiving)}/سنة)` : `Include living costs (${formatUsd(annualLiving)}/yr)`}</span>
            </label>
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span style={{ color: BODY_GRAY }}>{isAr ? 'الرسوم' : 'Tuition'} ({(costDuration / 12).toFixed(1)} {isAr ? 'سنة' : 'yr'})</span>
                <span className="font-semibold" style={{ color: BLUE }}>{formatUsd(Math.round(annualTuition * costDuration / 12))}</span>
              </div>
              {includeLiving && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: BODY_GRAY }}>{isAr ? 'المعيشة' : 'Living'} ({(costDuration / 12).toFixed(1)} {isAr ? 'سنة' : 'yr'})</span>
                  <span className="font-semibold" style={{ color: ORANGE }}>{formatUsd(Math.round(annualLiving * costDuration / 12))}</span>
                </div>
              )}
            </div>
            <div className="rounded-xl p-4 text-white" style={{ background: NAVY }}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm uppercase tracking-wider">{isAr ? 'الإجمالي' : 'Total'}</span>
                <span className="text-2xl font-bold">{(() => { const total = calculateTotalCost(annualTuition, includeLiving ? annualLiving : 0, costDuration); return total !== null ? formatUsd(total) : '—' })()}</span>
              </div>
            </div>
            {!isVerified && (
              <p className="text-xs mt-3" style={{ color: '#d97706' }}>
                {isAr ? '⚠️ البيانات المالية تقديرية. يرجى التحقق من الموقع الرسمي.' : '⚠️ Financial data is estimated. Verify with the official university website.'}
              </p>
            )}
          </div>
        </section>

        {/* ─── Scholarships ─── */}
        <section id="scholarships" className="scroll-mt-28">
          <h2 className="text-xl font-bold mb-5" style={{ color: NAVY }}>
            {isAr ? 'المنح' : 'Scholarships'}
            <span className="font-normal text-base ml-2" style={{ color: '#94a3b8' }}>({uni.scholarships.length})</span>
          </h2>
          {uni.scholarships.length === 0 ? (
            <div className="text-center py-12 rounded-xl" style={{ border: '1px solid #e2e8f0' }}>
              <Award className="size-10 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
              <p className="text-sm" style={{ color: BODY_GRAY }}>{isAr ? 'لا منح متاحة' : 'No scholarships listed yet.'}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {uni.scholarships.map(s => (
                <div key={s.id} className="rounded-xl p-5 transition-shadow hover:shadow-md" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#fff7ed' }}>
                        <Award className="size-4" style={{ color: ORANGE }} />
                      </div>
                      <h3 className="font-semibold text-sm" style={{ color: NAVY }}>{s.name}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold" style={{ color: ORANGE }}>{formatUsdCompact(s.amountUsd)}</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium capitalize" style={{ border: '1px solid #e2e8f0', color: BODY_GRAY }}>{s.amountType}</span>
                    </div>
                  </div>
                  <p className="text-xs mb-3" style={{ color: BODY_GRAY }}>{s.eligibility}</p>
                  {s.deadline && (
                    <div className="text-xs flex items-center gap-1 mb-2" style={{ color: BODY_GRAY }}>
                      <CalendarIcon className="size-3" />
                      {isAr ? 'آخر موعد' : 'Apply by'}: {s.deadline}
                    </div>
                  )}
                  {s.applicationUrl && (
                    <a href={s.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: ORANGE, color: '#fff' }}>
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
            <h2 className="text-xl font-bold" style={{ color: NAVY }}>
              {isAr ? 'المراجعات' : 'Reviews'}
              {avgRating !== null && <span className="font-normal text-base ml-2" style={{ color: '#94a3b8' }}>({realReviews.length})</span>}
            </h2>
            <Button variant="outline" size="sm" onClick={openReviewForm} className="gap-2">
              <Star className="size-4" />
              {isAr ? 'اكتب مراجعة' : 'Write a review'}
            </Button>
          </div>
          {avgRating !== null ? (
            <>
              <div className="rounded-xl p-5 mb-5 flex items-center gap-4" style={{ background: '#eff6ff' }}>
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: BLUE }}>{avgRating.toFixed(1)}</div>
                  <StarRow value={avgRating} size={16} />
                </div>
                <div className="text-sm" style={{ color: BODY_GRAY }}>
                  {isAr ? `بناءً على ${realReviews.length} مراجعة` : `Based on ${realReviews.length} ${realReviews.length === 1 ? 'review' : 'reviews'}`}
                </div>
              </div>
              <div className="space-y-4">
                {realReviews.map(r => (
                  <div key={r.id} className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: NAVY }}>{r.userName}</div>
                        <div className="text-xs" style={{ color: BODY_GRAY }}>{r.userCountry}</div>
                      </div>
                      <div className="text-right">
                        <StarRow value={r.ratingOverall} />
                        <div className="text-xs mt-1" style={{ color: BODY_GRAY }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: BODY_GRAY }}>{r.reviewText}</p>
                    {r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {r.tags.map(tag => <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px]" style={{ border: '1px solid #e2e8f0', color: BODY_GRAY }}>{tag}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 rounded-xl" style={{ border: '1px solid #e2e8f0' }}>
              <Star className="size-10 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
              <h3 className="font-semibold mb-1" style={{ color: NAVY }}>{isAr ? 'كن أول من يراجع' : 'Be the first to review'}</h3>
              <p className="text-sm mb-4" style={{ color: BODY_GRAY }}>{isAr ? 'شارك تجربتك' : 'Share your experience to help other students'}</p>
              <Button onClick={openReviewForm} size="sm">{isAr ? 'اكتب مراجعة' : 'Write a review'}</Button>
            </div>
          )}
        </section>

        {/* ─── Admissions (Visa & Life) ─── */}
        <section id="admissions" className="scroll-mt-28">
          <h2 className="text-xl font-bold mb-5" style={{ color: NAVY }}>
            {isAr ? 'التأشيرة والقبول' : 'Visa & Admissions'}
          </h2>
          {/* Light blue panel */}
          <div className="rounded-xl p-6" style={{ background: LIGHT_BLUE_PANEL }}>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: requirements */}
              <div>
                <h3 className="font-bold mb-4 text-base" style={{ color: NAVY }}>
                  {isAr ? 'متطلبات القبول' : 'Admission Requirements'}
                </h3>
                <div className="space-y-3">
                  {[
                    { title: isAr ? 'خط القبول' : 'Acceptance Letter', desc: isAr ? 'خط قبول من الجامعة' : 'University acceptance letter' },
                    { title: isAr ? 'جواز سفر' : 'Valid Passport', desc: isAr ? 'ساري 6+ أشهر' : '6+ months validity' },
                    { title: isAr ? 'إثبات مالي' : 'Financial Proof', desc: isAr ? 'إثبات القدرة على الرسوم والمعيشة' : 'Proof of tuition and living costs' },
                    { title: isAr ? 'شهادة لغة' : 'English Proficiency', desc: isAr ? 'IELTS/TOEFL' : 'TOEFL / IELTS or equivalent' },
                    { title: isAr ? 'كشوف الدرجات' : 'Required Documents', desc: isAr ? 'موثقة' : 'Transcripts, ID/passport copy, photo' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="size-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: BLUE }}>
                        <CheckCircle2 className="size-3 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>{item.title}</div>
                        <div className="text-xs" style={{ color: BODY_GRAY }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right: application steps */}
              <div>
                <h3 className="font-bold mb-4 text-base text-center" style={{ color: NAVY }}>
                  {isAr ? 'خطوات التقديم' : 'Application Steps'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: '👤', title: isAr ? 'إنشاء حساب' : 'Create Account', desc: isAr ? 'سجل في البوابة' : 'Register on our portal' },
                    { icon: '📝', title: isAr ? 'تعبئة الطلب' : 'Fill Application', desc: isAr ? 'أكمل وقدم طلبك' : 'Complete and submit' },
                    { icon: '📄', title: isAr ? 'رفع المستندات' : 'Upload Documents', desc: isAr ? 'قدم المستندات' : 'Submit required documents' },
                    { icon: '✅', title: isAr ? 'مراجعة الطلب' : 'Application Review', desc: isAr ? 'سنراجع ونخبرك' : 'We review and notify' },
                  ].map((step, i) => (
                    <div key={i} className="text-center">
                      <div className="size-12 rounded-full flex items-center justify-center text-xl mx-auto mb-2" style={{ background: i === 0 ? BLUE : LIGHT_BLUE_ICON }}>
                        {step.icon}
                      </div>
                      <div className="text-xs font-semibold" style={{ color: NAVY }}>{i + 1}. {step.title}</div>
                      <div className="text-[10px]" style={{ color: BODY_GRAY }}>{step.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 text-right">
                  <button
                    onClick={openContact}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md text-sm font-medium"
                    style={{ background: BLUE, color: '#fff' }}
                  >
                    {isAr ? 'ابدأ التقديم' : 'Start Your Application'}
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Disclaimer */}
          <div className="mt-4 text-xs rounded-lg p-3" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
            {isAr ? '⚠️ هذه معلومات عامة. تحقق دائماً من السفارة المعنية للمتطلبات الحالية.' : '⚠️ This is general guidance. Always verify current requirements with the relevant embassy.'}
          </div>
        </section>

        {/* ─── Claim link ─── */}
        <div className="pt-8 border-t text-center" style={{ borderColor: '#e2e8f0' }}>
          <p className="text-xs mb-2" style={{ color: BODY_GRAY }}>{isAr ? 'هل تمثل هذه الجامعة؟' : 'Represent this university?'}</p>
          <button onClick={() => router.push(`/claim/${uni.slug}`)} className="inline-flex items-center gap-1.5 text-xs hover:underline" style={{ color: BLUE }}>
            <Building2 className="size-3.5" />
            {isAr ? 'اطلب إدارة الملف' : 'Claim this profile'}
          </button>
        </div>
      </div>

      {/* ─── Footer (navy) ─── */}
      <footer className="text-white text-center py-4 text-xs" style={{ background: NAVY }}>
        <p>© {new Date().getFullYear()} {uni.name}. Profile powered by EduPath.</p>
      </footer>

      {/* ─── Mobile sticky CTA ─── */}
      <AnimatePresence>
        {showStickyCta && !contactOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="fixed bottom-0 inset-x-0 z-30 md:hidden p-3 shadow-2xl"
            style={{ background: '#fff', borderTop: '1px solid #e2e8f0' }}
          >
            <button onClick={openContact} className="w-full flex items-center justify-center gap-2 py-3 rounded-md font-semibold text-sm" style={{ background: ORANGE, color: '#fff' }}>
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

// ─── FactRow ────────────────────────────────────────────────────────────────

function FactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#fff', color: NAVY }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex justify-between items-center">
        <span className="text-xs" style={{ color: BODY_GRAY }}>{label}</span>
        <span className="text-sm font-semibold" style={{ color: NAVY }}>{value}</span>
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
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }} className="size-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#ffedd5' }}>
              <CheckCircle2 className="size-8" style={{ color: ORANGE }} />
            </motion.div>
            <h3 className="text-xl font-bold mb-2">{t('messageSent')}</h3>
            <p className="text-sm mb-6" style={{ color: BODY_GRAY }}>{t('messageSentDesc', { name: universityName })}</p>
            <Button onClick={() => onOpenChange(false)} style={{ background: ORANGE, color: '#fff' }}>OK</Button>
          </div>
        ) : (
          <>
            <div className="p-5 text-white" style={{ background: NAVY }}>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}>
                  <Mail className="size-5" style={{ color: ORANGE }} />
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
                  <div className="space-y-1.5"><Label htmlFor="c-name" className="text-xs">{t('yourName')} *</Label><Input id="c-name" value={name} onChange={e => setName(e.target.value)} required /></div>
                  <div className="space-y-1.5"><Label htmlFor="c-email" className="text-xs">{t('email')} *</Label><Input id="c-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="c-country" className="text-xs">{t('country')}</Label><Input id="c-country" value={country} onChange={e => setCountry(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="c-gpa" className="text-xs">{t('gpa')}</Label><Input id="c-gpa" type="number" step="0.1" placeholder="3.5" value={gpa} onChange={e => setGpa(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="c-field" className="text-xs">{t('fieldOfInterest')}</Label><Input id="c-field" value={field} onChange={e => setField(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="c-msg" className="text-xs">{t('yourMessage')} *</Label><Textarea id="c-msg" rows={4} placeholder={t('messagePlaceholder')} value={message} onChange={e => setMessage(e.target.value)} required maxLength={2000} className="resize-none" /></div>
                <Button type="submit" className="w-full gap-2" style={{ background: ORANGE, color: '#fff' }} disabled={submitting}>
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
