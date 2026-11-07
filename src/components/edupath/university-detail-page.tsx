'use client'

/**
 * University Detail Page — Swiss/Grid Editorial Design (Design 2 fork)
 *
 * Exact fork of the JUST admissions page design:
 * - Warm off-white bg #F4F2EC
 * - Electric blue #1B3FA0 for buttons, links, headings
 * - Lime accent #C8F03C for small dash marks
 * - Single-column editorial layout with "On this page" sidebar
 * - Programs table, numbered requirements grid, blue CTA band
 *
 * Colors: bg #F4F2EC, blue #1B3FA0, black #0D0D0D, lime #C8F03C
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Star, Heart, ArrowLeftRight, MapPin, Users, Globe,
  ExternalLink, Mail, Send, Loader2, Building2, GraduationCap,
  Award, CheckCircle2, ChevronRight, ShieldCheck, TrendingUp,
  Clock, Search, Plus, ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { formatUsd, formatUsdCompact } from '@/lib/edupath'
import { calculateTotalCost } from '@/lib/financial'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { ReviewForm } from '@/components/edupath/review-form'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics-client'

// ─── Colors (exact from mockup) ─────────────────────────────────────────────

const BG = '#F4F2EC'
const BLUE = '#1B3FA0'
const BLACK = '#0D0D0D'
const LIME = '#C8F03C'
const BODY = '#1A1A1A'
const MUTED = '#555555'
const BORDER = '#0D0D0D'

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

function getInitials(name: string): string {
  return name.split(' ').filter(w => w.length > 2 && !['of', 'the', 'and', 'for', 'University', 'university'].includes(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2) || name.slice(0, 2).toUpperCase()
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map(i => <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />)}</div>
}

// ─── Section labels ─────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'programs', num: '02', label: 'Programs' },
  { id: 'costs', num: '03', label: 'Costs' },
  { id: 'scholarships', num: '04', label: 'Scholarships' },
  { id: 'reviews', num: '05', label: 'Reviews' },
  { id: 'admissions', num: '06', label: 'Admissions' },
] as const

// ─── Main ───────────────────────────────────────────────────────────────────

type Props = { uni: University }

export function UniversityDetailPage({ uni }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('Detail')
  const tToast = useTranslations('Toast')
  const locale = useLocale()

  const [isSaved, setIsSaved] = React.useState(false)
  const [isComparing, setIsComparing] = React.useState(false)
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [reviewFormOpen, setReviewFormOpen] = React.useState(false)
  const [contactOpen, setContactOpen] = React.useState(false)
  const [showStickyCta, setShowStickyCta] = React.useState(false)
  const [reviews, setReviews] = React.useState<Review[]>(uni.reviews)
  const [activeSection, setActiveSection] = React.useState<string>('overview')
  const [costDuration, setCostDuration] = React.useState(36)
  const [includeLiving, setIncludeLiving] = React.useState(true)

  React.useEffect(() => { track('university_view', { universityId: uni.id, metadata: { slug: uni.slug, name: uni.name } }) }, [uni.id, uni.slug, uni.name])

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetch('/api/me').then(r => r.ok ? r.json() : { profile: null }).then(data => { if (data.profile) setProfile(data.profile) }).catch(() => {})
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((e) => { if (e === 'SIGNED_OUT') { setProfile(null); setIsSaved(false) } })
    return () => subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!profile) return
    fetch('/api/saved-lists').then(r => r.ok ? r.json() : { universities: [] }).then(data => { const s = new Set<string>((data.universities ?? []).map((u: { id: string }) => u.id)); setIsSaved(s.has(uni.id)) }).catch(() => {})
  }, [profile, uni.id])

  React.useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) }) }, { rootMargin: '-80px 0px -60% 0px' })
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const openContact = () => { setContactOpen(true); track('contact_open', { universityId: uni.id }) }
  const handleSave = async () => {
    if (!profile) { toast({ title: tToast('signInToSave'), description: tToast('signInToSaveDesc') }); setAuthModalOpen(true); return }
    const w = isSaved; setIsSaved(!w); track(w ? 'unsave' : 'save', { universityId: uni.id })
    try { const res = await fetch('/api/saved-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ universityId: uni.id }) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); toast({ title: d.action === 'saved' ? tToast('savedToList') : tToast('removedFromSaved'), description: uni.name }) }
    catch { setIsSaved(w); toast({ title: tToast('failedToSave'), variant: 'destructive' }) }
  }
  const handleCompare = () => { if (isComparing) { setIsComparing(false); toast({ title: tToast('compareRemoved'), description: uni.name }) } else { setIsComparing(true); track('compare', { universityId: uni.id }); toast({ title: tToast('compareAdded'), description: uni.name }) } }
  const openReviewForm = () => { if (!profile) { toast({ title: tToast('signInToReview'), description: tToast('signInToReviewDesc') }); setAuthModalOpen(true); return }; setReviewFormOpen(true) }
  const handleReviewSubmitted = async () => { try { const res = await fetch(`/api/reviews?universityId=${uni.id}`); if (!res.ok) return; const d = await res.json(); if (d.reviews) setReviews(d.reviews) } catch {} }

  const realReviews = reviews.filter(r => !r.isSample)
  const avgRating = realReviews.length > 0 ? realReviews.reduce((s, r) => s + r.ratingOverall, 0) / realReviews.length : null
  const isAr = locale === 'ar'
  const isClaimed = Boolean(uni.claimedByUserId)
  const isVerified = uni.dataConfidence === 'high' || isClaimed
  const annualTuition = uni.cheapestProgramTuition || uni.tuitionUsd
  const annualLiving = uni.livingCostUsd
  const annualTotal = annualTuition + annualLiving
  const initials = getInitials(uni.name)
  const degreeLevel = uni.programs[0]?.degreeLevel || 'Bachelor'
  const shortestDuration = uni.programs.length > 0 ? Math.min(...uni.programs.map(p => p.durationMonths)) : 48
  const durationYears = (shortestDuration / 12).toFixed(0)

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* ─── Top Nav ─── */}
      <nav className="border-b" style={{ borderColor: '#E5E2D8', background: BG }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: back + emblem + name */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/')} className="hover:opacity-70 shrink-0">
              <ArrowLeft className="size-5" style={{ color: BLACK }} />
            </button>
            {/* Circular seal */}
            <div className="size-8 rounded-full flex items-center justify-center shrink-0" style={{ background: BLUE }}>
              <span className="text-[10px] font-bold text-white">{initials}</span>
            </div>
            <span className="hidden sm:block text-sm font-bold truncate max-w-[200px]" style={{ color: BLACK }}>{uni.name}</span>
          </div>
          {/* Right: actions */}
          <div className="flex items-center gap-3">
            <button onClick={handleCompare} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors', isComparing ? 'text-white' : 'hover:opacity-70')} style={isComparing ? { background: BLUE, color: '#fff' } : { color: BLACK }}>
              <ArrowLeftRight className="size-3.5" />
              <span className="hidden sm:inline">{isComparing ? t('inCompare') : t('addToCompare')}</span>
            </button>
            <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium hover:opacity-70" style={{ color: isSaved ? '#e11d48' : BLACK }}>
              <Heart className={cn('size-3.5', isSaved && 'fill-current')} />
              <span className="hidden sm:inline">{isSaved ? t('saved') : t('save')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <div className="border-b" style={{ borderColor: BORDER }}>
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-8">
          {/* Left: headline */}
          <div className="flex-1">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-4 h-1" style={{ background: LIME }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BLACK }}>
                {isAr ? 'القبول 2025/2026' : 'ADMISSIONS 2025/2026'}
              </span>
            </div>
            {/* Location */}
            <div className="flex items-center gap-1.5 mb-4 text-sm" style={{ color: MUTED }}>
              <MapPin className="size-3.5" />
              {uni.city}, {uni.country}
              {isClaimed && (
                <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                  <ShieldCheck className="size-2.5" /> Verified
                </span>
              )}
            </div>
            {/* H1 — ultra-bold, like the mockup */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6" style={{ color: BLACK, fontFamily: 'Archivo, Inter, system-ui, sans-serif' }}>
              {uni.name}
            </h1>
            {/* Tagline */}
            <p className="text-base md:text-lg leading-relaxed max-w-xl mb-6" style={{ color: BODY }}>
              {uni.descriptionEn.slice(0, 180)}{uni.descriptionEn.length > 180 ? '…' : ''}
            </p>
            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openContact}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: BLUE, color: '#fff' }}
              >
                {t('contact.ctaShort')}
                <ArrowUpRight className="size-4" />
              </button>
              <a
                href={uni.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border transition-colors hover:bg-black hover:text-white"
                style={{ borderColor: BLACK, color: BLACK }}
              >
                {t('visitWebsite')}
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </div>

          {/* Right: applications open card */}
          <div className="shrink-0 md:border-l md:pl-8 md:w-72" style={{ borderColor: BLACK }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-3.5 h-1" style={{ background: LIME }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BLACK }}>
                {isAr ? 'القبول 2025/2026' : 'ADMISSIONS 2025/2026'}
              </span>
            </div>
            <p className="text-xl font-semibold mb-1" style={{ color: BLACK }}>
              {isAr ? 'الطلبات مفتوحة.' : 'Applications are open.'}
            </p>
            <p className="text-xl font-medium mb-4" style={{ color: BODY }}>
              {isAr ? 'ابنِ المستقبل معنا.' : 'Build the future with us.'}
            </p>
            <button
              onClick={openContact}
              className="w-full inline-flex items-center justify-between px-4 py-2.5 text-sm font-medium"
              style={{ background: BLUE, color: '#fff' }}
            >
              {isAr ? 'ابدأ التقديم' : 'Start your application'}
              <ArrowUpRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Degree/Duration/Location strip ─── */}
      <div className="border-b" style={{ borderColor: BORDER }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center divide-x" style={{ borderColor: BLACK }}>
          <div className="flex-1 px-4 first:pl-0">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>
              {isAr ? 'الدرجة' : 'Degree'}
            </div>
            <div className="text-sm font-semibold capitalize" style={{ color: BLACK }}>
              {degreeLevel === 'bachelor' ? 'Bachelor of Science' : degreeLevel === 'master' ? 'Master' : degreeLevel === 'phd' ? 'PhD' : degreeLevel}
            </div>
          </div>
          <div className="flex-1 px-4" style={{ borderColor: BLACK }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>
              {isAr ? 'المدة' : 'Duration'}
            </div>
            <div className="text-sm font-semibold" style={{ color: BLACK }}>
              {durationYears} {isAr ? 'سنوات' : 'Years'} ({shortestDuration / 6} {isAr ? 'فصول' : 'Semesters'})
            </div>
          </div>
          <div className="flex-1 px-4" style={{ borderColor: BLACK }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>
              {isAr ? 'الموقع' : 'Location'}
            </div>
            <div className="text-sm font-semibold" style={{ color: BLACK }}>{uni.city}, {uni.country}</div>
          </div>
        </div>
      </div>

      {/* ─── Two-column body ─── */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-10">
        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-12">

          {/* Overview */}
          <section id="overview" className="scroll-mt-20">
            <SectionLabel>{isAr ? 'نبذة' : 'Overview'}</SectionLabel>
            <h2 className="text-xl font-bold mb-3" style={{ color: BLACK }}>
              {isAr ? 'نبذة عن الجامعة' : 'About ' + uni.name}
            </h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: BODY }}>
              {uni.descriptionEn}
            </p>
            {uni.descriptionAr && (
              <p className="text-sm leading-relaxed text-right" dir="rtl" lang="ar" style={{ color: BODY }}>
                {uni.descriptionAr}
              </p>
            )}
            {/* Quick stats inline */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t" style={{ borderColor: '#E5E2D8' }}>
              <Stat label={isAr ? 'طلاب دوليون' : 'Intl Students'} value={`${uni.intlStudentPct}%`} />
              <Stat label={isAr ? 'نسبة القبول' : 'Acceptance'} value={uni.acceptanceRate !== null ? `${uni.acceptanceRate}%` : '—'} />
              <Stat label={isAr ? 'البرامج' : 'Programs'} value={`${uni.programs.length}`} />
              <Stat label={isAr ? 'المنح' : 'Scholarships'} value={`${uni.scholarships.length}`} />
            </div>
          </section>

          {/* Programs table */}
          <section id="programs" className="scroll-mt-20">
            <SectionLabel>{isAr ? 'برامجنا' : 'Our Programs'}</SectionLabel>
            {/* Table */}
            <div className="border-t" style={{ borderColor: BORDER }}>
              {/* Header */}
              <div className="flex items-center py-2.5 border-b text-[11px] font-bold uppercase tracking-wider" style={{ color: BLUE, borderColor: BORDER }}>
                <div className="flex-1">{isAr ? 'البرنامج' : 'Program'}</div>
                <div className="w-24 hidden sm:block">{isAr ? 'الدرجة' : 'Degree'}</div>
                <div className="w-24 hidden sm:block">{isAr ? 'المدة' : 'Duration'}</div>
                <div className="w-20 hidden md:block">{isAr ? 'اللغة' : 'Language'}</div>
                <div className="w-16 text-right">{isAr ? 'الرسوم' : 'Tuition'}</div>
              </div>
              {/* Rows */}
              {uni.programs.map(p => (
                <a
                  key={p.id}
                  href={p.applicationUrl || uni.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center py-3 border-b group hover:bg-blue-50/50 transition-colors"
                  style={{ borderColor: BORDER }}
                >
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <ChevronRight className="size-3.5 shrink-0" style={{ color: BLUE }} />
                    <span className="text-sm font-semibold truncate" style={{ color: BLACK }}>{p.name}</span>
                  </div>
                  <div className="w-24 hidden sm:block text-xs capitalize" style={{ color: BODY }}>{p.degreeLevel}</div>
                  <div className="w-24 hidden sm:block text-xs" style={{ color: BODY }}>{p.durationMonths} mo</div>
                  <div className="w-20 hidden md:block text-xs" style={{ color: BODY }}>{p.language}</div>
                  <div className="w-16 text-right text-xs font-semibold" style={{ color: BLUE }}>{formatUsdCompact(p.tuitionUsd)}</div>
                </a>
              ))}
            </div>
          </section>

          {/* Costs */}
          <section id="costs" className="scroll-mt-20">
            <SectionLabel>{isAr ? 'التكلفة' : 'Costs'}</SectionLabel>
            <div className="border p-6" style={{ borderColor: BLUE }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold" style={{ color: BLACK }}>
                  {isAr ? `المدة: ${costDuration} شهر` : `Duration: ${costDuration} months (${(costDuration / 12).toFixed(1)} years)`}
                </span>
              </div>
              <input type="range" min={12} max={72} step={6} value={costDuration} onChange={e => setCostDuration(Number(e.target.value))} className="w-full mb-2" style={{ accentColor: BLUE }} />
              <div className="flex justify-between text-xs mb-4" style={{ color: MUTED }}>
                <span>1 year</span><span>6 years</span>
              </div>
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input type="checkbox" checked={includeLiving} onChange={e => setIncludeLiving(e.target.checked)} className="size-4" style={{ accentColor: BLUE }} />
                <span className="text-sm">{isAr ? `تضمين المعيشة (${formatUsd(annualLiving)}/سنة)` : `Include living costs (${formatUsd(annualLiving)}/yr)`}</span>
              </label>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm"><span style={{ color: MUTED }}>{isAr ? 'الرسوم' : 'Tuition'}</span><span className="font-semibold" style={{ color: BLUE }}>{formatUsd(Math.round(annualTuition * costDuration / 12))}</span></div>
                {includeLiving && <div className="flex justify-between text-sm"><span style={{ color: MUTED }}>{isAr ? 'المعيشة' : 'Living'}</span><span className="font-semibold" style={{ color: BLACK }}>{formatUsd(Math.round(annualLiving * costDuration / 12))}</span></div>}
              </div>
              <div className="p-4 flex justify-between items-center" style={{ background: BLUE, color: '#fff' }}>
                <span className="font-semibold text-sm uppercase tracking-wider">{isAr ? 'الإجمالي' : 'Total'}</span>
                <span className="text-2xl font-bold">{(() => { const total = calculateTotalCost(annualTuition, includeLiving ? annualLiving : 0, costDuration); return total !== null ? formatUsd(total) : '—' })()}</span>
              </div>
            </div>
          </section>

          {/* Scholarships */}
          <section id="scholarships" className="scroll-mt-20">
            <SectionLabel>{isAr ? 'المنح' : 'Scholarships'}</SectionLabel>
            {uni.scholarships.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: MUTED }}>{isAr ? 'لا منح متاحة' : 'No scholarships listed.'}</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {uni.scholarships.map(s => (
                  <div key={s.id} className="border p-5" style={{ borderColor: '#E5E2D8' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-bold" style={{ color: BLACK }}>{s.name}</h3>
                      <span className="text-lg font-bold shrink-0" style={{ color: BLUE }}>{formatUsdCompact(s.amountUsd)}</span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: MUTED }}>{s.eligibility}</p>
                    {s.deadline && <div className="text-xs mb-3" style={{ color: MUTED }}>Apply by: {s.deadline}</div>}
                    {s.applicationUrl && <a href={s.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: BLUE }}>Apply Now <ArrowUpRight className="size-3" /></a>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reviews */}
          <section id="reviews" className="scroll-mt-20">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>{isAr ? 'المراجعات' : 'Reviews'}</SectionLabel>
              <Button variant="outline" size="sm" onClick={openReviewForm} className="gap-2"><Star className="size-4" />{isAr ? 'اكتب مراجعة' : 'Write a review'}</Button>
            </div>
            {avgRating !== null ? (
              <>
                <div className="flex items-center gap-4 mb-5 p-4" style={{ background: '#fff', border: '1px solid #E5E2D8' }}>
                  <div className="text-center"><div className="text-3xl font-bold" style={{ color: BLUE }}>{avgRating.toFixed(1)}</div><StarRow value={avgRating} /></div>
                  <span className="text-sm" style={{ color: MUTED }}>{realReviews.length} {realReviews.length === 1 ? 'review' : 'reviews'}</span>
                </div>
                <div className="space-y-4">
                  {realReviews.map(r => (
                    <div key={r.id} className="border p-5" style={{ borderColor: '#E5E2D8' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div><div className="text-sm font-semibold" style={{ color: BLACK }}>{r.userName}</div><div className="text-xs" style={{ color: MUTED }}>{r.userCountry}</div></div>
                        <div className="text-right"><StarRow value={r.ratingOverall} /><div className="text-xs mt-1" style={{ color: MUTED }}>{new Date(r.createdAt).toLocaleDateString()}</div></div>
                      </div>
                      <p className="text-sm" style={{ color: BODY }}>{r.reviewText}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="border py-12 text-center" style={{ borderColor: '#E5E2D8' }}>
                <Star className="size-10 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
                <h3 className="font-semibold mb-1" style={{ color: BLACK }}>{isAr ? 'كن أول من يراجع' : 'Be the first to review'}</h3>
                <p className="text-sm mb-4" style={{ color: MUTED }}>{isAr ? 'شارك تجربتك' : 'Share your experience'}</p>
                <Button onClick={openReviewForm} size="sm">{isAr ? 'اكتب مراجعة' : 'Write a review'}</Button>
              </div>
            )}
          </section>

          {/* Admissions */}
          <section id="admissions" className="scroll-mt-20">
            <SectionLabel>{isAr ? 'متطلبات القبول' : 'Admission Requirements'}</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-0">
              {[
                { num: '01', title: isAr ? 'شهادة الثانوية' : 'General Secondary Certificate', desc: isAr ? 'شهادة ثانوية عامة أو ما يعادلها بمعدل 70%+' : 'High school certificate or equivalent with 70%+ average' },
                { num: '02', title: isAr ? 'متطلبات المادة' : 'Subject Requirements', desc: isAr ? 'متطلبات خاصة بالبرنامج' : 'Program-specific subject requirements (e.g. Math 70%+)' },
                { num: '03', title: isAr ? 'إتقان الإنجليزية' : 'English Proficiency', desc: 'TOEFL 79 / IELTS 6.0 or equivalent' },
                { num: '04', title: isAr ? 'الوثائق المطلوبة' : 'Required Documents', desc: isAr ? 'كشوف الدرجات، جواز السفر، صور' : 'Transcripts, ID/passport copy, passport-sized photo' },
                { num: '05', title: isAr ? 'بيان شخصي' : 'Statement of Purpose', desc: isAr ? 'مقال يوضح أهدافك' : 'Personal essay outlining your goals' },
                { num: '06', title: isAr ? 'تأشيرة الطالب' : 'Student Visa', desc: isAr ? 'للطلاب الدوليين' : 'For international students — check embassy requirements' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 py-4 border-b" style={{ borderColor: BORDER }}>
                  <span className="text-3xl font-extrabold leading-none shrink-0" style={{ color: BLUE }}>{item.num}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold mb-1" style={{ color: BLACK }}>{item.title}</div>
                    <div className="text-xs" style={{ color: BODY }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0 space-y-8">
          {/* On this page */}
          <div className="lg:sticky lg:top-20">
            <div className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: BLACK }}>On this page</div>
            <div className="space-y-1">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={cn('w-full flex items-center gap-3 py-2 text-left text-sm font-medium border-l-2 transition-colors', activeSection === s.id ? '' : 'border-transparent hover:border-blue-200')}
                  style={activeSection === s.id ? { borderColor: BLUE, color: BLUE } : { color: BODY }}
                >
                  <span className="text-[10px]" style={{ color: activeSection === s.id ? BLUE : MUTED }}>{s.num}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Facts card */}
          <div className="border p-5" style={{ borderColor: BLUE }}>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: BLACK }}>Quick Facts</div>
            <div className="space-y-3">
              <FactItem icon={<MapPin className="size-4" />} label="Location" value={`${uni.city}, ${uni.country}`} />
              <FactItem icon={<Users className="size-4" />} label="Intl. Students" value={`${uni.intlStudentPct}%`} />
              <FactItem icon={<TrendingUp className="size-4" />} label="Acceptance" value={uni.acceptanceRate !== null ? `${uni.acceptanceRate}%` : '—'} />
              <FactItem icon={<GraduationCap className="size-4" />} label="Programs" value={`${uni.programs.length}`} />
              <FactItem icon={<Award className="size-4" />} label="Scholarships" value={`${uni.scholarships.length}`} />
              <FactItem icon={<Globe className="size-4" />} label="Languages" value={[...new Set(uni.programs.map(p => p.language))].join(', ') || '—'} />
            </div>
          </div>
        </aside>
      </div>

      {/* ─── Blue CTA Band ─── */}
      <div className="py-10" style={{ background: BLUE }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white">
            <h2 className="text-xl font-semibold mb-2">{isAr ? 'نحن هنا لك.' : "We're here for you."}</h2>
            <p className="text-sm text-white/80 max-w-md">
              {isAr ? 'من الاستشارة الأكاديمية إلى الدعم الوظيفي، EduPath معك في كل خطوة.' : 'From academic advising to visa support and career guidance, EduPath is with you every step of the way.'}
            </p>
          </div>
          <button
            onClick={openContact}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border text-white hover:bg-white hover:text-blue-700 transition-colors shrink-0"
            style={{ borderColor: '#fff' }}
          >
            {t('contact.ctaShort')}
            <ArrowUpRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t py-6" style={{ borderColor: BORDER, background: BG }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: BODY }}>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full flex items-center justify-center" style={{ background: BLUE }}>
              <span className="text-[8px] font-bold text-white">{initials}</span>
            </div>
            <span>© {new Date().getFullYear()} {uni.name}. Profile powered by EduPath.</span>
          </div>
          <button onClick={() => router.push(`/claim/${uni.slug}`)} className="hover:underline flex items-center gap-1" style={{ color: BLUE }}>
            <Building2 className="size-3" /> Claim this profile
          </button>
        </div>
      </footer>

      {/* ─── Mobile sticky CTA ─── */}
      <AnimatePresence>
        {showStickyCta && !contactOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 z-30 md:hidden p-3 shadow-2xl"
            style={{ background: '#fff', borderTop: '1px solid #E5E2D8' }}
          >
            <button onClick={openContact} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium" style={{ background: BLUE, color: '#fff' }}>
              <Mail className="size-4" />{t('contact.ctaShort')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Contact modal ─── */}
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} universityId={uni.id} universityName={uni.name} profile={profile} />

      {/* ─── Other modals ─── */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={p => setProfile(p)} />
      <ReviewForm open={reviewFormOpen} onClose={() => setReviewFormOpen(false)} universityId={uni.id} universityName={uni.name} onSubmitted={handleReviewSubmitted} />
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BLACK }}>{children}</div>
      <div className="w-7 h-1 mt-1" style={{ background: LIME }} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: MUTED }}>{label}</div>
      <div className="text-lg font-bold" style={{ color: BLACK }}>{value}</div>
    </div>
  )
}

function FactItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b last:border-0" style={{ borderColor: '#E5E2D8' }}>
      <div style={{ color: BLUE }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px]" style={{ color: MUTED }}>{label}</div>
        <div className="text-xs font-semibold" style={{ color: BLACK }}>{value}</div>
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
      const d = await res.json(); if (!res.ok) throw new Error(d.error)
      setSubmitted(true); setMessage(''); toast({ title: t('messageSent'), description: t('messageSentDesc', { name: universityName }) })
    } catch (err) { toast({ title: t('failedToSend'), description: err instanceof Error ? err.message : t('tryAgain'), variant: 'destructive' }) }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-lg gap-0">
        {submitted ? (
          <div className="p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="size-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#E5E2D8' }}>
              <CheckCircle2 className="size-8" style={{ color: BLUE }} />
            </motion.div>
            <h3 className="text-xl font-bold mb-2">{t('messageSent')}</h3>
            <p className="text-sm mb-6" style={{ color: MUTED }}>{t('messageSentDesc', { name: universityName })}</p>
            <Button onClick={() => onOpenChange(false)} style={{ background: BLUE, color: '#fff' }}>OK</Button>
          </div>
        ) : (
          <>
            <div className="p-5 text-white" style={{ background: BLUE }}>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Mail className="size-5" />
                </div>
                <div><h3 className="text-lg font-bold">{t('title', { name: universityName })}</h3><p className="text-xs text-white/60">{t('description')}</p></div>
              </div>
            </div>
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">{t('yourName')} *</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                  <div className="space-y-1.5"><Label className="text-xs">{t('email')} *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">{t('country')}</Label><Input value={country} onChange={e => setCountry(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">{t('gpa')}</Label><Input type="number" step="0.1" placeholder="3.5" value={gpa} onChange={e => setGpa(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">{t('fieldOfInterest')}</Label><Input value={field} onChange={e => setField(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">{t('yourMessage')} *</Label><Textarea rows={4} placeholder={t('messagePlaceholder')} value={message} onChange={e => setMessage(e.target.value)} required maxLength={2000} className="resize-none" /></div>
                <Button type="submit" className="w-full gap-2" style={{ background: BLUE, color: '#fff' }} disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}{submitting ? t('submitting') : t('sendInquiry')}
                </Button>
              </form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
