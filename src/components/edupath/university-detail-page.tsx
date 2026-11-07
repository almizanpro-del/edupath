'use client'

/**
 * University Detail Page — Design 3: Cream/Emerald Luxury
 *
 * Forked from the JUST Graduate Studies mockup.
 * VLM forkability: 9/10 — typography and layout driven, photos are
 * decorative. All photos replaced with CSS gradients + inline SVG.
 *
 * Colors:
 *   Cream bg:     #F7F1E8
 *   Light cream:  #FBF7F0
 *   Emerald:      #1E3D34 (headings, buttons, panels)
 *   Dark emerald: #12382E (badges, deadline panel, footer)
 *   Gold:         #B29A5B (eyebrows), #C6A96C (numbers), #D4B06A (CTA)
 *   Body text:    #5B6B65 / #6B7A74
 *   Nav text:     #33413C
 *
 * Fonts: Playfair Display (serif headings) + Inter (body)
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Star, Heart, ArrowLeftRight, MapPin, Users, Globe,
  ExternalLink, Mail, Send, Loader2, Building2, GraduationCap,
  Award, CheckCircle2, ChevronRight, ShieldCheck, TrendingUp,
  Clock, Phone, ArrowUpRight, Calendar, MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { formatUsd, formatUsdCompact, countryFlagUrl } from '@/lib/edupath'
import { calculateTotalCost } from '@/lib/financial'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { ReviewForm } from '@/components/edupath/review-form'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics-client'

// ─── Colors ─────────────────────────────────────────────────────────────────

const C = {
  cream: '#F7F1E8',
  lightCream: '#FBF7F0',
  emerald: '#1E3D34',
  darkEmerald: '#12382E',
  divider: '#2E4F45',
  gold: '#B29A5B',
  brightGold: '#C6A96C',
  ctaGold: '#D4B06A',
  tagGoldText: '#A98E4E',
  tagGoldBorder: '#D9C48F',
  body: '#5B6B65',
  body2: '#6B7A74',
  nav: '#33413C',
  hairline: '#E3DACC',
  hairline2: '#D8CFC0',
  muted: '#9DB0A8',
  muted2: '#B9C6C0',
  footerLegal: '#7E948B',
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Program = { id: string; name: string; degreeLevel: string; field: string; durationMonths: number; language: string; tuitionUsd: number; deadline: string | null; entryReqs: string | null; applicationUrl?: string; applicationFeeUsd?: number }
type Scholarship = { id: string; name: string; amountUsd: number; amountType: string; eligibility: string; deadline: string | null; applicationUrl?: string }
type Review = { id: string; userName: string; userCountry: string; ratingOverall: number; ratingAffordability: number; ratingVisa: number; ratingTeaching: number; ratingSafety: number; ratingSocial: number; reviewText: string; helpfulCount: number; verifiedEnrollment: boolean; tags: string[]; createdAt: string; isSample?: boolean }
type University = { id: string; slug: string; name: string; country: string; city: string; website: string; tuitionUsd: number; livingCostUsd: number; intlStudentPct: number; acceptanceRate: number | null; currency: string; logoUrl: string | null; descriptionEn: string; descriptionAr: string; programs: Program[]; scholarships: Scholarship[]; reviews: Review[]; avgRating: number | null; reviewCount: number; cheapestProgramTuition: number; visaNotes?: string; dataSource?: string; dataConfidence?: string; lastVerifiedAt?: string | null; claimedByUserId?: string }

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').filter(w => w.length > 2 && !['of', 'the', 'and', 'for', 'University', 'university'].includes(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2) || name.slice(0, 2).toUpperCase()
}
function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map(i => <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />)}</div>
}
function CalendarIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
}

// ─── Main ───────────────────────────────────────────────────────────────────

type Props = { uni: University }

export function UniversityDetailPage({ uni }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('Detail')
  const tToast = useTranslations('Toast')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const [isSaved, setIsSaved] = React.useState(false)
  const [isComparing, setIsComparing] = React.useState(false)
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [reviewFormOpen, setReviewFormOpen] = React.useState(false)
  const [contactOpen, setContactOpen] = React.useState(false)
  const [showStickyCta, setShowStickyCta] = React.useState(false)
  const [reviews, setReviews] = React.useState<Review[]>(uni.reviews)
  const [costDuration, setCostDuration] = React.useState(36)
  const [includeLiving, setIncludeLiving] = React.useState(true)

  React.useEffect(() => { track('university_view', { universityId: uni.id, metadata: { slug: uni.slug, name: uni.name } }) }, [uni.id, uni.slug, uni.name])
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) fetch('/api/me').then(r => r.ok ? r.json() : { profile: null }).then(data => { if (data.profile) setProfile(data.profile) }).catch(() => {}) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((e) => { if (e === 'SIGNED_OUT') { setProfile(null); setIsSaved(false) } })
    return () => subscription.unsubscribe()
  }, [])
  React.useEffect(() => { if (!profile) return; fetch('/api/saved-lists').then(r => r.ok ? r.json() : { universities: [] }).then(data => { const s = new Set<string>((data.universities ?? []).map((u: { id: string }) => u.id)); setIsSaved(s.has(uni.id)) }).catch(() => {}) }, [profile, uni.id])
  React.useEffect(() => { const onScroll = () => setShowStickyCta(window.scrollY > 500); window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); return () => window.removeEventListener('scroll', onScroll) }, [])

  const openContact = () => { setContactOpen(true); track('contact_open', { universityId: uni.id }) }
  const handleSave = async () => { if (!profile) { toast({ title: tToast('signInToSave'), description: tToast('signInToSaveDesc') }); setAuthModalOpen(true); return } const w = isSaved; setIsSaved(!w); track(w ? 'unsave' : 'save', { universityId: uni.id }); try { const res = await fetch('/api/saved-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ universityId: uni.id }) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); toast({ title: d.action === 'saved' ? tToast('savedToList') : tToast('removedFromSaved'), description: uni.name }) } catch { setIsSaved(w); toast({ title: tToast('failedToSave'), variant: 'destructive' }) } }
  const handleCompare = () => { if (isComparing) { setIsComparing(false); toast({ title: tToast('compareRemoved'), description: uni.name }) } else { setIsComparing(true); track('compare', { universityId: uni.id }); toast({ title: tToast('compareAdded'), description: uni.name }) } }
  const openReviewForm = () => { if (!profile) { toast({ title: tToast('signInToReview'), description: tToast('signInToReviewDesc') }); setAuthModalOpen(true); return }; setReviewFormOpen(true) }
  const handleReviewSubmitted = async () => { try { const res = await fetch(`/api/reviews?universityId=${uni.id}`); if (!res.ok) return; const d = await res.json(); if (d.reviews) setReviews(d.reviews) } catch {} }

  const realReviews = reviews.filter(r => !r.isSample)
  const avgRating = realReviews.length > 0 ? realReviews.reduce((s, r) => s + r.ratingOverall, 0) / realReviews.length : null
  const isClaimed = Boolean(uni.claimedByUserId)
  const isVerified = uni.dataConfidence === 'high' || isClaimed
  const annualTuition = uni.cheapestProgramTuition || uni.tuitionUsd
  const annualLiving = uni.livingCostUsd
  const annualTotal = annualTuition + annualLiving
  const initials = getInitials(uni.name)
  const shortestDuration = uni.programs.length > 0 ? Math.min(...uni.programs.map(p => p.durationMonths)) : 48

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="min-h-screen" style={{ background: C.cream, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ─── Nav ─── */}
      <nav className="border-b sticky top-0 z-40" style={{ borderColor: C.hairline2, background: '#fff' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/')} className="hover:opacity-60 shrink-0"><ArrowLeft className="size-5" style={{ color: C.nav }} /></button>
            <div className="size-9 rounded-full flex items-center justify-center shrink-0 border" style={{ background: C.emerald, borderColor: C.brightGold }}>
              <span className="text-[10px] font-bold text-white">{initials}</span>
            </div>
            <span className="hidden sm:block text-sm font-bold truncate max-w-[180px]" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>{uni.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCompare} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors', isComparing ? 'text-white' : 'hover:opacity-70')} style={isComparing ? { background: C.emerald, color: '#fff' } : { color: C.nav }}>
              <ArrowLeftRight className="size-3.5" /><span className="hidden sm:inline">{isComparing ? t('inCompare') : t('addToCompare')}</span>
            </button>
            <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium hover:opacity-70" style={{ color: isSaved ? '#e11d48' : C.nav }}>
              <Heart className={cn('size-3.5', isSaved && 'fill-current')} /><span className="hidden sm:inline">{isSaved ? t('saved') : t('save')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero with curved mask ─── */}
      <div className="relative overflow-hidden" style={{ background: C.cream }}>
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 flex flex-col md:flex-row gap-8 items-center">
          {/* Left: text */}
          <div className="flex-1 z-10">
            {/* Eyebrow */}
            <div className="mb-2">
              <span className="text-[11px] uppercase tracking-[3px] font-bold" style={{ color: C.gold }}>
                {isAr ? 'القبول 2025/2026' : 'ADMISSIONS 2025/2026'}
              </span>
              <div className="w-6 h-px mt-1.5" style={{ background: C.gold }} />
            </div>
            {/* Location */}
            <div className="flex items-center gap-1.5 mb-4 text-sm" style={{ color: C.body2 }}>
              <MapPin className="size-3.5" />{uni.city}, {uni.country}
              {isClaimed && <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}><ShieldCheck className="size-2.5" /> Verified</span>}
            </div>
            {/* H1 — serif */}
            <h1 className="text-4xl md:text-5xl font-semibold leading-[1.1] mb-4" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>
              {uni.name}
            </h1>
            {/* Paragraph */}
            <p className="text-sm leading-relaxed max-w-md mb-6" style={{ color: C.body }}>
              {uni.descriptionEn.slice(0, 180)}{uni.descriptionEn.length > 180 ? '…' : ''}
            </p>
            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <button onClick={openContact} className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: C.emerald, color: '#fff' }}>
                {t('contact.ctaShort')}<ChevronRight className="size-4" />
              </button>
              <a href={uni.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold border transition-colors hover:bg-emerald-50" style={{ borderColor: C.emerald, color: C.emerald }}>
                {t('visitWebsite')}<ExternalLink className="size-4" />
              </a>
            </div>
          </div>
          {/* Right: visual block with gradient (replacing photo) */}
          <div className="w-full md:w-80 h-64 md:h-80 shrink-0 relative" style={{ borderRadius: '160px 0 0 0', overflow: 'hidden', background: `linear-gradient(135deg, ${C.darkEmerald}, ${C.emerald})` }}>
            {/* Country flag faded in */}
            <img src={countryFlagUrl(uni.country, 640)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
            {/* Gold accent dots */}
            <div className="absolute top-8 right-8 size-2 rounded-full" style={{ background: C.brightGold, opacity: 0.6 }} />
            <div className="absolute bottom-12 right-16 size-1.5 rounded-full" style={{ background: C.brightGold, opacity: 0.4 }} />
            {/* Ranked badge */}
            <div className="absolute bottom-4 right-4 left-4 p-4 flex items-center gap-3" style={{ background: C.darkEmerald, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
              <div className="flex-1">
                <div className="text-xs" style={{ color: '#fff' }}>{isAr ? 'تصنيف' : 'Ranked'}</div>
                <div className="text-3xl font-bold" style={{ color: '#fff', fontFamily: 'Playfair Display, Georgia, serif' }}>#{uni.acceptanceRate ? Math.min(10, Math.ceil(uni.acceptanceRate / 10)) : '1'}</div>
                <div className="text-xs" style={{ color: '#fff' }}>{isAr ? 'في ' + uni.country : 'in ' + uni.country}</div>
              </div>
              <div className="w-px h-12" style={{ background: C.divider }} />
              <div className="text-[9px] leading-tight" style={{ color: C.muted }}>
                {isAr ? 'إحصائيات' : 'EduPath'}<br />{isAr ? 'القبول' : 'Directory'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats strip ─── */}
      <div className="border-y" style={{ borderColor: C.hairline, background: C.lightCream }}>
        <div className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 divide-x" style={{ borderColor: C.hairline }}>
          <StatItem icon={<Users className="size-5" />} value={`${uni.intlStudentPct}%`} label={isAr ? 'طلاب دوليون' : 'Intl Students'} />
          <StatItem icon={<TrendingUp className="size-5" />} value={uni.acceptanceRate !== null ? `${uni.acceptanceRate}%` : '—'} label={isAr ? 'نسبة القبول' : 'Acceptance'} />
          <StatItem icon={<GraduationCap className="size-5" />} value={`${uni.programs.length}`} label={isAr ? 'برامج' : 'Programs'} />
          <StatItem icon={<Award className="size-5" />} value={`${uni.scholarships.length}`} label={isAr ? 'منح' : 'Scholarships'} />
        </div>
      </div>

      {/* ─── Programs ─── */}
      <section id="programs" className="max-w-6xl mx-auto px-6 py-12 scroll-mt-20">
        <Eyebrow>{isAr ? 'برامجنا' : 'OUR PROGRAMS'}</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-semibold mb-6" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>
          {isAr ? 'البرامج المتاحة' : 'Available Programs'}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {uni.programs.map((p, i) => (
            <div key={p.id} className="bg-white p-5 flex gap-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              {/* Number */}
              <div className="text-2xl font-bold shrink-0" style={{ color: C.brightGold, fontFamily: 'Playfair Display, Georgia, serif' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold mb-1" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>{p.name}</h3>
                <p className="text-xs mb-3 line-clamp-2" style={{ color: C.body2 }}>
                  {p.entryReqs ? p.entryReqs.slice(0, 100) + '…' : `${p.field} · ${p.language}`}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ color: C.tagGoldText, border: `1px solid ${C.tagGoldBorder}` }}>{p.degreeLevel}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ color: C.tagGoldText, border: `1px solid ${C.tagGoldBorder}` }}>{formatUsdCompact(p.tuitionUsd)}/yr</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ color: C.tagGoldText, border: `1px solid ${C.tagGoldBorder}` }}>{p.durationMonths} mo</span>
                </div>
                <a href={p.applicationUrl || uni.website} target="_blank" rel="noopener noreferrer" className="text-xs font-bold inline-flex items-center gap-1" style={{ color: C.emerald }}>
                  {isAr ? 'اعرف المزيد' : 'Learn More'} <ChevronRight className="size-3" style={{ color: C.gold }} />
                </a>
              </div>
              {/* Visual block */}
              <div className="w-20 shrink-0 hidden sm:block" style={{ background: `linear-gradient(135deg, ${C.emerald}, ${C.darkEmerald})` }}>
                <div className="h-full flex items-center justify-center text-2xl opacity-50">
                  {p.field.toLowerCase().includes('engineer') || p.field.toLowerCase().includes('computer') ? '⚙️' : p.field.toLowerCase().includes('medic') || p.field.toLowerCase().includes('pharmac') ? '🧪' : p.field.toLowerCase().includes('business') ? '📊' : '📚'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How to Apply (split: cream + dark emerald) ─── */}
      <section id="admissions" className="scroll-mt-20 grid md:grid-cols-2">
        {/* Left: timeline */}
        <div className="p-8 md:p-12" style={{ background: C.cream }}>
          <Eyebrow>{isAr ? 'القبول' : 'ADMISSIONS'}</Eyebrow>
          <h2 className="text-2xl font-semibold mb-6" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>{isAr ? 'كيفية التقديم' : 'How to Apply'}</h2>
          <div className="space-y-0">
            {[
              { title: isAr ? 'تحقق من الأهلية' : 'Check Eligibility', desc: isAr ? 'راجع متطلبات البرنامج' : 'Review program requirements and academic criteria.' },
              { title: isAr ? 'جهز الوثائق' : 'Prepare Documents', desc: isAr ? 'كشوف، سيرة ذاتية، بيان هدف' : 'Gather transcripts, CV, statement of purpose, test scores.' },
              { title: isAr ? 'قدم الطلب' : 'Submit Application', desc: isAr ? 'أكمل الطلب الإلكتروني' : 'Complete the online application and upload documents.' },
              { title: isAr ? 'مراجعة الطلب' : 'Application Review', desc: isAr ? 'لجنة القبول تراجع طلبك' : 'Our committee reviews your application.' },
              { title: isAr ? 'قرار القبول' : 'Admission Decision', desc: isAr ? 'استقبل قرار القبول' : 'Receive your admission decision and next steps.' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 relative">
                {i < 4 && <div className="absolute left-[13px] top-7 bottom-0 w-px border-l border-dashed" style={{ borderColor: '#B9C6C0' }} />}
                <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: C.emerald }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: C.emerald }}>{step.title}</div>
                  <div className="text-xs" style={{ color: C.body2 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: dark emerald panel */}
        <div className="p-8 md:p-12 text-white" style={{ background: C.darkEmerald }}>
          <div className="space-y-6">
            {/* Deadline */}
            <div className="flex items-start gap-3">
              <Calendar className="size-8 shrink-0 mt-1" style={{ color: C.ctaGold }} />
              <div>
                <div className="text-xs" style={{ color: C.muted2 }}>{isAr ? 'موعد التقديم' : 'Application Deadline'}</div>
                <div className="text-xl font-semibold" style={{ color: '#fff', fontFamily: 'Playfair Display, Georgia, serif' }}>
                  {uni.programs[0]?.deadline || isAr ? 'راجع الموقع' : 'Check website'}
                </div>
                <div className="text-sm" style={{ color: C.ctaGold }}>{isAr ? 'القبول مفتوح' : 'Applications are open'}</div>
              </div>
            </div>
            {/* Divider */}
            <div className="h-px" style={{ background: C.divider }} />
            {/* Contact */}
            <div className="flex items-start gap-3">
              <MessageCircle className="size-8 shrink-0 mt-1" style={{ color: C.ctaGold }} />
              <div>
                <div className="text-xl font-semibold mb-1" style={{ color: '#fff', fontFamily: 'Playfair Display, Georgia, serif' }}>{isAr ? 'أسئلة؟' : 'Questions?'}</div>
                <div className="text-xs mb-3" style={{ color: C.muted2 }}>{isAr ? 'فريق القبول هنا للمساعدة' : 'Our admissions team is here to help.'}</div>
                <button onClick={openContact} className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium border" style={{ borderColor: '#fff', color: '#fff' }}>
                  {isAr ? 'تواصل مع القبول' : 'Contact Admissions'} <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Costs + Scholarships + Reviews ─── */}
      <section className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* Costs */}
        <div id="costs" className="scroll-mt-20">
          <Eyebrow>{isAr ? 'التكلفة' : 'COSTS'}</Eyebrow>
          <h2 className="text-2xl font-semibold mb-6" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>{isAr ? 'حاسبة التكلفة' : 'Cost Calculator'}</h2>
          <div className="bg-white p-6 max-w-2xl" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="mb-4">
              <span className="text-sm font-medium" style={{ color: C.emerald }}>{isAr ? `المدة: ${costDuration} شهر` : `Duration: ${costDuration} months (${(costDuration / 12).toFixed(1)} years)`}</span>
            </div>
            <input type="range" min={12} max={72} step={6} value={costDuration} onChange={e => setCostDuration(Number(e.target.value))} className="w-full mb-2" style={{ accentColor: C.emerald }} />
            <div className="flex justify-between text-xs mb-4" style={{ color: C.body2 }}><span>1 year</span><span>6 years</span></div>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={includeLiving} onChange={e => setIncludeLiving(e.target.checked)} className="size-4" style={{ accentColor: C.emerald }} />
              <span className="text-sm">{isAr ? `تضمين المعيشة (${formatUsd(annualLiving)}/سنة)` : `Include living costs (${formatUsd(annualLiving)}/yr)`}</span>
            </label>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm"><span style={{ color: C.body2 }}>{isAr ? 'الرسوم' : 'Tuition'}</span><span className="font-semibold" style={{ color: C.emerald }}>{formatUsd(Math.round(annualTuition * costDuration / 12))}</span></div>
              {includeLiving && <div className="flex justify-between text-sm"><span style={{ color: C.body2 }}>{isAr ? 'المعيشة' : 'Living'}</span><span className="font-semibold" style={{ color: C.emerald }}>{formatUsd(Math.round(annualLiving * costDuration / 12))}</span></div>}
            </div>
            <div className="p-4 flex justify-between items-center" style={{ background: C.emerald, color: '#fff' }}>
              <span className="font-semibold text-sm uppercase tracking-wider">{isAr ? 'الإجمالي' : 'Total'}</span>
              <span className="text-2xl font-bold">{(() => { const total = calculateTotalCost(annualTuition, includeLiving ? annualLiving : 0, costDuration); return total !== null ? formatUsd(total) : '—' })()}</span>
            </div>
          </div>
        </div>

        {/* Scholarships */}
        <div id="scholarships" className="scroll-mt-20">
          <Eyebrow>{isAr ? 'المنح' : 'SCHOLARSHIPS'}</Eyebrow>
          {uni.scholarships.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: C.body2 }}>{isAr ? 'لا منح متاحة' : 'No scholarships listed.'}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {uni.scholarships.map(s => (
                <div key={s.id} className="bg-white p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>{s.name}</h3>
                    <span className="text-lg font-bold shrink-0" style={{ color: C.brightGold }}>{formatUsdCompact(s.amountUsd)}</span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: C.body2 }}>{s.eligibility}</p>
                  {s.deadline && <div className="text-xs mb-3" style={{ color: C.body2 }}>Apply by: {s.deadline}</div>}
                  {s.applicationUrl && <a href={s.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: C.emerald }}>Apply Now <ChevronRight className="size-3" style={{ color: C.gold }} /></a>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div id="reviews" className="scroll-mt-20">
          <div className="flex items-center justify-between mb-4">
            <Eyebrow>{isAr ? 'المراجعات' : 'REVIEWS'}</Eyebrow>
            <Button variant="outline" size="sm" onClick={openReviewForm} className="gap-2" style={{ borderColor: C.emerald, color: C.emerald }}><Star className="size-4" />{isAr ? 'اكتب مراجعة' : 'Write a review'}</Button>
          </div>
          {avgRating !== null ? (
            <>
              <div className="flex items-center gap-4 mb-5 p-4 bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="text-center"><div className="text-3xl font-bold" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>{avgRating.toFixed(1)}</div><StarRow value={avgRating} /></div>
                <span className="text-sm" style={{ color: C.body2 }}>{realReviews.length} {realReviews.length === 1 ? 'review' : 'reviews'}</span>
              </div>
              <div className="space-y-4">
                {realReviews.map(r => (
                  <div key={r.id} className="bg-white p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div><div className="text-sm font-bold" style={{ color: C.emerald }}>{r.userName}</div><div className="text-xs" style={{ color: C.body2 }}>{r.userCountry}</div></div>
                      <div className="text-right"><StarRow value={r.ratingOverall} /><div className="text-xs mt-1" style={{ color: C.body2 }}>{new Date(r.createdAt).toLocaleDateString()}</div></div>
                    </div>
                    <p className="text-sm" style={{ color: C.body }}>{r.reviewText}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white py-12 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Star className="size-10 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
              <h3 className="font-semibold mb-1" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>{isAr ? 'كن أول من يراجع' : 'Be the first to review'}</h3>
              <p className="text-sm mb-4" style={{ color: C.body2 }}>{isAr ? 'شارك تجربتك' : 'Share your experience'}</p>
              <Button onClick={openReviewForm} size="sm" style={{ background: C.emerald, color: '#fff' }}>{isAr ? 'اكتب مراجعة' : 'Write a review'}</Button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Overview (About + Quick Facts) ─── */}
      <section id="overview" className="max-w-6xl mx-auto px-6 py-12 scroll-mt-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Eyebrow>{isAr ? 'نبذة' : 'OVERVIEW'}</Eyebrow>
            <p className="text-sm leading-relaxed mb-4" style={{ color: C.body }}>{uni.descriptionEn}</p>
            {uni.descriptionAr && <p className="text-sm leading-relaxed text-right" dir="rtl" style={{ color: C.body }}>{uni.descriptionAr}</p>}
          </div>
          <div className="border p-5" style={{ borderColor: C.emerald }}>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: C.emerald }}>Quick Facts</div>
            <div className="space-y-3">
              <FactItem icon={<MapPin className="size-4" />} label="Location" value={`${uni.city}, ${uni.country}`} />
              <FactItem icon={<Users className="size-4" />} label="Intl Students" value={`${uni.intlStudentPct}%`} />
              <FactItem icon={<TrendingUp className="size-4" />} label="Acceptance" value={uni.acceptanceRate !== null ? `${uni.acceptanceRate}%` : '—'} />
              <FactItem icon={<GraduationCap className="size-4" />} label="Programs" value={`${uni.programs.length}`} />
              <FactItem icon={<Award className="size-4" />} label="Scholarships" value={`${uni.scholarships.length}`} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer CTA band ─── */}
      <div className="py-10" style={{ background: C.darkEmerald }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white">
            <h2 className="text-xl md:text-2xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>{isAr ? 'جاهز لتشكيل مستقبلك؟' : 'Ready to shape your future?'}</h2>
            <p className="text-sm" style={{ color: C.muted2 }}>{isAr ? 'انضم إلى مجتمع المبتكرين' : 'Join a community of innovators and leaders.'}</p>
          </div>
          <button onClick={openContact} className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold shrink-0" style={{ background: C.ctaGold, color: C.darkEmerald }}>
            {t('contact.ctaShort')}<ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="py-4 text-center" style={{ background: C.darkEmerald, borderTop: `1px solid ${C.divider}` }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs" style={{ color: C.muted2 }}>
          <span>© {new Date().getFullYear()} {uni.name}. Powered by EduPath.</span>
          <button onClick={() => router.push(`/claim/${uni.slug}`)} className="hover:underline flex items-center gap-1" style={{ color: C.muted2 }}><Building2 className="size-3" /> Claim</button>
        </div>
      </footer>

      {/* ─── Mobile sticky CTA ─── */}
      <AnimatePresence>
        {showStickyCta && !contactOpen && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed bottom-0 inset-x-0 z-30 md:hidden p-3" style={{ background: '#fff', borderTop: `1px solid ${C.hairline}`, boxShadow: '0 -4px 12px rgba(0,0,0,0.1)' }}>
            <button onClick={openContact} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold" style={{ background: C.emerald, color: '#fff' }}><Mail className="size-4" />{t('contact.ctaShort')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Contact modal ─── */}
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} universityId={uni.id} universityName={uni.name} profile={profile} />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={p => setProfile(p)} />
      <ReviewForm open={reviewFormOpen} onClose={() => setReviewFormOpen(false)} universityId={uni.id} universityName={uni.name} onSubmitted={handleReviewSubmitted} />
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <span className="text-[11px] uppercase tracking-[3px] font-bold" style={{ color: C.gold }}>{children}</span>
      <div className="w-6 h-px mt-1.5" style={{ background: C.gold }} />
    </div>
  )
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 first:pl-0 last:pr-0">
      <div style={{ color: C.nav }}>{icon}</div>
      <div>
        <div className="text-lg font-bold" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>{value}</div>
        <div className="text-[11px]" style={{ color: C.body2 }}>{label}</div>
      </div>
    </div>
  )
}

function FactItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b last:border-0" style={{ borderColor: C.hairline }}>
      <div style={{ color: C.emerald }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px]" style={{ color: C.body2 }}>{label}</div>
        <div className="text-xs font-semibold" style={{ color: C.emerald }}>{value}</div>
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
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="size-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.cream }}>
              <CheckCircle2 className="size-8" style={{ color: C.emerald }} />
            </motion.div>
            <h3 className="text-xl font-bold mb-2" style={{ color: C.emerald, fontFamily: 'Playfair Display, Georgia, serif' }}>{t('messageSent')}</h3>
            <p className="text-sm mb-6" style={{ color: C.body2 }}>{t('messageSentDesc', { name: universityName })}</p>
            <Button onClick={() => onOpenChange(false)} style={{ background: C.emerald, color: '#fff' }}>OK</Button>
          </div>
        ) : (
          <>
            <div className="p-5 text-white" style={{ background: C.emerald }}>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}><Mail className="size-5" /></div>
                <div><h3 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>{t('title', { name: universityName })}</h3><p className="text-xs text-white/60">{t('description')}</p></div>
              </div>
            </div>
            <div className="p-5" style={{ background: C.cream }}>
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
                <Button type="submit" className="w-full gap-2" style={{ background: C.emerald, color: '#fff' }} disabled={submitting}>
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
