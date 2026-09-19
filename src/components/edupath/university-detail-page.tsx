'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, DollarSign, Star, Heart, ArrowLeftRight, CheckCircle2, MapPin, Users, TrendingUp, Languages, Clock, ExternalLink, ThumbsUp, Calculator, MessageSquarePlus, Mail, Send, Loader2, Building2, GraduationCap, Award, Globe } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatUsd, formatUsdCompact, totalCost, countryFlagUrl } from '@/lib/edupath'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { ReviewForm } from '@/components/edupath/review-form'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics-client'
import { SocialShare } from '@/components/edupath/social-share'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations'

type Program = {
  id: string; name: string; degreeLevel: string; field: string
  durationMonths: number; language: string; tuitionUsd: number
  deadline: string | null; entryReqs: string | null
}
type Scholarship = {
  id: string; name: string; amountUsd: number; amountType: string
  eligibility: string; deadline: string | null
}
type Review = {
  id: string; userName: string; userCountry: string
  ratingOverall: number; ratingAffordability: number; ratingVisa: number
  ratingTeaching: number; ratingSafety: number; ratingSocial: number
  reviewText: string; helpfulCount: number; verifiedEnrollment: boolean
  tags: string[]; createdAt: string
}
type University = {
  id: string; slug: string; name: string; country: string; city: string
  website: string; tuitionUsd: number; livingCostUsd: number
  intlStudentPct: number; acceptanceRate: number | null; currency: string
  logoUrl: string | null; descriptionEn: string; descriptionAr: string
  programs: Program[]; scholarships: Scholarship[]; reviews: Review[]
  avgRating: number | null; reviewCount: number; cheapestProgramTuition: number
}

function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={cn(i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </div>
  )
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100
  const color = value >= 4 ? 'bg-blue-500' : value >= 3 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28 dark:text-slate-400">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div className={cn('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      </div>
      <span className="text-xs font-medium w-8 text-right dark:text-slate-200">{value.toFixed(1)}</span>
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

type Props = { uni: University }

export function UniversityDetailPage({ uni }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('Detail')
  const locale = useLocale()
  const [activeTab, setActiveTab] = React.useState('overview')
  const [costDuration, setCostDuration] = React.useState(36)
  const [includeLiving, setIncludeLiving] = React.useState(true)
  const [isSaved, setIsSaved] = React.useState(false)
  const [isComparing, setIsComparing] = React.useState(false)
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [reviewFormOpen, setReviewFormOpen] = React.useState(false)
  const [contactOpen, setContactOpen] = React.useState(false)
  const [showFloatingCta, setShowFloatingCta] = React.useState(false)
  const [reviews, setReviews] = React.useState<Review[]>(uni.reviews)

  React.useEffect(() => {
    track('university_view', { universityId: uni.id, metadata: { slug: uni.slug, name: uni.name } })
  }, [uni.id, uni.slug, uni.name])

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch('/api/me').then(r => r.json()).then(data => { if (data.profile) setProfile(data.profile) }).catch(() => {})
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

  // Show floating CTA after user scrolls past the hero (~600px)
  React.useEffect(() => {
    const onScroll = () => setShowFloatingCta(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const openContact = () => { setContactOpen(true); track('contact_open', { universityId: uni.id }) }

  const handleSave = async () => {
    if (!profile) { toast({ title: 'Sign in to save universities', description: 'Create a free account to bookmark universities.' }); setAuthModalOpen(true); return }
    const wasSaved = isSaved; setIsSaved(!wasSaved); track(wasSaved ? 'unsave' : 'save', { universityId: uni.id })
    try {
      const res = await fetch('/api/saved-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ universityId: uni.id }) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
      toast({ title: data.action === 'saved' ? 'Saved to your list' : 'Removed from saved list', description: uni.name })
    } catch { setIsSaved(wasSaved); toast({ title: 'Failed to save', variant: 'destructive' }) }
  }

  const handleCompare = () => {
    if (isComparing) { setIsComparing(false); toast({ title: 'Removed from comparison', description: uni.name }) }
    else { setIsComparing(true); track('compare', { universityId: uni.id }); toast({ title: 'Added to comparison', description: uni.name }) }
  }

  const openReviewForm = () => {
    if (!profile) { toast({ title: 'Sign in to write a review', description: 'Reviews help other MENA students make informed decisions.' }); setAuthModalOpen(true); return }
    setReviewFormOpen(true)
  }

  const handleReviewSubmitted = async () => {
    try { const res = await fetch(`/api/reviews?universityId=${uni.id}`); if (!res.ok) return; const data = await res.json(); if (data.reviews) setReviews(data.reviews) } catch {}
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingOverall, 0) / reviews.length : null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
              <ArrowLeft className="size-4" /><span className="hidden sm:inline">{t('back') || 'Back'}</span>
            </Button>
          </motion.div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={isComparing ? 'default' : 'outline'} onClick={handleCompare} className="gap-2 dark:border-slate-600">
              <ArrowLeftRight className="size-4" />{isComparing ? t('inCompare') : t('addToCompare')}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSave} className="gap-2">
              <Heart className={cn('size-4 transition-all', isSaved && 'fill-rose-500 text-rose-500 scale-110')} />{isSaved ? t('saved') : t('save')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section with animated gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl" animate={{ x: [0, 40, 0], y: [0, 20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-10 -right-20 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl" animate={{ x: [0, -30, 0], y: [0, 40, 0] }} transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }} />
        </div>

        <div className="relative container mx-auto max-w-7xl px-4 py-10 md:py-16">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col md:flex-row items-start gap-6">
            {/* Flag/logo — glassmorphic crest */}
            <motion.div variants={fadeInUp} className="size-20 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center shrink-0 overflow-hidden shadow-2xl ring-1 ring-white/5">
              <Image src={countryFlagUrl(uni.country, 80)} alt={uni.country} width={56} height={38} className="rounded-lg" unoptimized />
            </motion.div>

            {/* Title + meta */}
            <motion.div variants={fadeInUp} className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-bold mb-3 bg-gradient-to-br from-white via-blue-50 to-blue-200 bg-clip-text text-transparent leading-tight">{uni.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1.5"><MapPin className="size-4" />{uni.city}, {uni.country}</span>
                <a href={uni.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white hover:underline transition-colors">
                  <ExternalLink className="size-4" />{t('visitWebsite')}
                </a>
                {avgRating !== null && (
                  <span className="flex items-center gap-1.5"><Star className="size-4 fill-amber-400 text-amber-400" />{avgRating.toFixed(1)} ({reviews.length} reviews)</span>
                )}
              </div>
            </motion.div>

            {/* Floating glass stat cards — tuition (blue) + living cost (orange) */}
            <motion.div variants={fadeInUp} className="flex flex-wrap gap-2 md:flex-col md:items-end">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/15 shadow-xl ring-1 ring-white/5 min-w-[140px]">
                <div className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Tuition from</div>
                <div className="text-xl font-bold text-blue-300 mt-0.5">{formatUsdCompact(uni.cheapestProgramTuition)}/yr</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/15 shadow-xl ring-1 ring-white/5 min-w-[140px]">
                <div className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Living cost</div>
                <div className="text-xl font-bold text-orange-300 mt-0.5">{formatUsdCompact(uni.livingCostUsd)}/yr</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main content area */}
      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Action bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={openContact} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/30 rounded-full px-5">
              <Mail className="size-4" />{t('contact.ctaShort')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/claim/${uni.slug}`)} className="gap-2 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full">
              <Building2 className="size-4" />Claim this university
            </Button>
          </div>
          <SocialShare url={`https://edupath-amber-three.vercel.app/university/${uni.slug}`} title={`${uni.name} — Tuition, Programs & Reviews | EduPath`} description={uni.descriptionEn} />
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-transparent h-auto p-0 gap-1 border-b w-max rounded-none">
              {[
                { value: 'overview', label: t('tabs.overview'), icon: Globe },
                { value: 'programs', label: `${t('tabs.programs')} (${uni.programs.length})`, icon: GraduationCap },
                { value: 'scholarships', label: `${t('tabs.scholarships')} (${uni.scholarships.length})`, icon: Award },
                { value: 'cost', label: t('tabs.cost'), icon: Calculator },
                { value: 'reviews', label: `${t('tabs.reviews')} (${reviews.length})`, icon: Star },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 gap-1.5 py-3 px-4 dark:data-[state=active]:border-blue-400 transition-colors">
                  <tab.icon className="size-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="mt-6">
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="grid lg:grid-cols-3 gap-6">
                {/* Left: description */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="rounded-2xl shadow-sm border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-3 dark:text-white">About {uni.name}</h3>
                      <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{uni.descriptionEn}</p>
                      {uni.descriptionAr && (
                        <div className="mt-6 pt-6 border-t dark:border-slate-700">
                          <h4 className="font-semibold mb-2 text-[11px] uppercase tracking-wider text-muted-foreground dark:text-slate-400">{t('descriptionAr')}</h4>
                          <p className="text-base leading-relaxed text-right text-slate-600 dark:text-slate-300" dir="rtl" lang="ar">{uni.descriptionAr}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Programs preview */}
                  <Card className="rounded-2xl shadow-sm border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg dark:text-white">Programs offered</h3>
                        <Badge variant="secondary" className="dark:bg-slate-800">{uni.programs.length} total</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {uni.programs.map(p => (
                          <Badge key={p.id} variant="outline" className="gap-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                            <GraduationCap className="size-3" />{p.field} · {p.degreeLevel}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right: stats sidebar */}
                <div className="space-y-4">
                  <Card className="rounded-2xl shadow-sm border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                      <h3 className="font-bold flex items-center gap-2">
                        <TrendingUp className="size-4" />Key Stats
                      </h3>
                    </div>
                    <CardContent className="p-2 space-y-1">
                      {[
                        { icon: DollarSign, label: t('stats.cheapestProgram'), value: formatUsd(uni.cheapestProgramTuition) + '/yr', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
                        { icon: DollarSign, label: t('stats.livingCost'), value: formatUsd(uni.livingCostUsd) + '/yr', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40' },
                        { icon: Users, label: t('stats.intlStudents'), value: uni.intlStudentPct + '%', color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-800' },
                        { icon: TrendingUp, label: t('stats.acceptance'), value: uni.acceptanceRate !== null ? uni.acceptanceRate + '%' : 'N/A', color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-800' },
                      ].map((stat, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
                            <stat.icon className={cn('size-4', stat.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium dark:text-slate-400">{stat.label}</div>
                            <div className={cn('font-bold text-sm', stat.color)}>{stat.value}</div>
                          </div>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Quick actions */}
                  <Card className="rounded-2xl shadow-sm border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                    <CardContent className="p-4 space-y-2">
                      <Button className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30" onClick={openContact}>
                        <Mail className="size-4" />{t('contact.cta')}
                      </Button>
                      <Button variant="outline" className="w-full gap-2 dark:border-slate-600" onClick={() => setActiveTab('cost')}>
                        <Calculator className="size-4" />Calculate total cost
                      </Button>
                      <Button variant="outline" className="w-full gap-2 dark:border-slate-600" onClick={() => setActiveTab('reviews')}>
                        <Star className="size-4" />Read reviews
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>

            {/* PROGRAMS TAB */}
            <TabsContent value="programs" className="mt-0">
              <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="grid md:grid-cols-2 gap-4">
                {uni.programs.map(p => (
                  <motion.div key={p.id} variants={staggerItem}>
                    <Card className="h-full rounded-2xl shadow-sm border-slate-200 hover:shadow-md hover:border-blue-200 transition-all dark:bg-slate-900 dark:border-slate-800 dark:hover:border-blue-800">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="text-xs capitalize dark:border-slate-600">{p.degreeLevel}</Badge>
                              <Badge variant="secondary" className="text-xs dark:bg-slate-800">{p.field}</Badge>
                              <Badge variant="outline" className="text-xs dark:border-slate-600"><Languages className="size-3 mr-1" />{p.language}</Badge>
                            </div>
                            <h4 className="font-semibold dark:text-white">{p.name}</h4>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatUsd(p.tuitionUsd)}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('programs.perYear')}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-3 border-t dark:border-slate-700">
                          <span className="flex items-center gap-1"><Clock className="size-3" />{p.durationMonths} {t('programs.months')}</span>
                          {p.deadline && <span className="flex items-center gap-1"><CalendarIcon className="size-3" />{t('programs.deadline')}: {p.deadline}</span>}
                        </div>
                        {p.entryReqs && (
                          <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg p-2 mt-3">
                            <strong>{t('programs.entryRequirements')}:</strong> {p.entryReqs}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </TabsContent>

            {/* SCHOLARSHIPS TAB */}
            <TabsContent value="scholarships" className="mt-0">
              {uni.scholarships.length === 0 ? (
                <div className="text-center py-16">
                  <Award className="size-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1 dark:text-white">{t('scholarships.none')}</h3>
                </div>
              ) : (
                <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="grid md:grid-cols-2 gap-4">
                  {uni.scholarships.map(s => (
                    <motion.div key={s.id} variants={staggerItem}>
                      <Card className="h-full rounded-2xl shadow-sm border-slate-200 hover:shadow-md hover:border-orange-200 transition-all dark:bg-slate-900 dark:border-slate-800 dark:hover:border-orange-800">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="size-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                                  <Award className="size-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <h4 className="font-semibold dark:text-white truncate">{s.name}</h4>
                              </div>
                              <Badge variant="outline" className="capitalize dark:border-slate-600">{s.amountType}</Badge>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{formatUsd(s.amountUsd)}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.amountType === 'full' ? t('scholarships.fullCoverage') : t('scholarships.amount')}</div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-slate-400 mt-2">{s.eligibility}</p>
                          {s.deadline && (
                            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1 dark:text-slate-400">
                              <CalendarIcon className="size-3" />{t('scholarships.applyBy')}: {s.deadline}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>

            {/* COST CALCULATOR TAB */}
            <TabsContent value="cost" className="mt-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 mb-3 ring-1 ring-blue-100 dark:ring-blue-900/40">
                    <Calculator className="size-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-xl mb-1 dark:text-white">{t('cost.title')}</h3>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">{t('cost.description')}</p>
                </div>

                <Card className="rounded-2xl shadow-sm border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-6 space-y-5">
                    {/* Duration slider */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium dark:text-slate-200">{t('cost.programDuration', { months: costDuration, years: (costDuration / 12).toFixed(1) })}</Label>
                      </div>
                      <Slider value={[costDuration]} onValueChange={(v) => setCostDuration(v[0])} min={12} max={72} step={6} className="mt-3" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>{t('cost.1year')}</span><span>{t('cost.6years')}</span>
                      </div>
                    </div>

                    {/* Living checkbox */}
                    <div className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <Checkbox id="include-living" checked={includeLiving} onCheckedChange={(v) => setIncludeLiving(v === true)} />
                      <Label htmlFor="include-living" className="text-sm cursor-pointer dark:text-slate-200">
                        {t('cost.includeLiving', { amount: formatUsd(uni.livingCostUsd) })}
                      </Label>
                    </div>

                    {/* Cost breakdown */}
                    <div className="space-y-3 pt-3 border-t dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground dark:text-slate-400">{t('cost.tuition', { years: (costDuration / 12).toFixed(1) })}</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{formatUsd(Math.round(uni.cheapestProgramTuition * costDuration / 12))}</span>
                      </div>
                      {includeLiving && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground dark:text-slate-400">{t('cost.living', { years: (costDuration / 12).toFixed(1) })}</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400 tabular-nums">{formatUsd(Math.round(uni.livingCostUsd * costDuration / 12))}</span>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-md shadow-blue-600/20">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm uppercase tracking-wider">{t('cost.total')}</span>
                        <motion.span key={costDuration + String(includeLiving)} initial={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold tabular-nums">
                          {formatUsd(totalCost(uni.cheapestProgramTuition, includeLiving ? uni.livingCostUsd : 0, costDuration))}
                        </motion.span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <strong>{t('cost.disclaimer')}</strong>
                </div>
              </motion.div>
            </TabsContent>

            {/* REVIEWS TAB */}
            <TabsContent value="reviews" className="mt-0 space-y-4">
              {/* Write review CTA */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-slate-900 border border-blue-200 dark:border-blue-800 rounded-2xl">
                <div>
                  <div className="font-semibold text-sm dark:text-white">{t('reviews.shareExperience')}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 dark:text-slate-400">{profile ? t('reviews.shareDescLoggedIn') : t('reviews.shareDescLoggedOut')}</div>
                </div>
                <Button onClick={openReviewForm} className="gap-2 shrink-0 bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30" size="sm">
                  <MessageSquarePlus className="size-4" />{t('reviews.writeReview')}
                </Button>
              </motion.div>

              {reviews.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3">
                    <Star className="size-7 text-slate-400" />
                  </div>
                  <h4 className="font-semibold mb-1 dark:text-white">{t('reviews.noReviews')}</h4>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">{t('reviews.noReviewsDesc', { name: uni.name })}</p>
                </div>
              ) : (
                <>
                  {/* Rating summary */}
                  {avgRating !== null && (
                    <Card className="rounded-2xl shadow-sm border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="text-center md:text-left">
                            <div className="text-5xl font-bold dark:text-white tabular-nums">{avgRating.toFixed(1)}</div>
                            <StarRating value={avgRating} size={20} />
                            <div className="text-xs text-muted-foreground mt-1 dark:text-slate-400 uppercase tracking-wider">{t('reviews.reviewCount', { count: reviews.length })}</div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <RatingBar label={t('reviews.subRatings.affordability')} value={reviews.reduce((s, r) => s + r.ratingAffordability, 0) / reviews.length} />
                            <RatingBar label={t('reviews.subRatings.teaching')} value={reviews.reduce((s, r) => s + r.ratingTeaching, 0) / reviews.length} />
                            <RatingBar label={t('reviews.subRatings.visa')} value={reviews.reduce((s, r) => s + r.ratingVisa, 0) / reviews.length} />
                            <RatingBar label={t('reviews.subRatings.safety')} value={reviews.reduce((s, r) => s + r.ratingSafety, 0) / reviews.length} />
                            <RatingBar label={t('reviews.subRatings.social')} value={reviews.reduce((s, r) => s + r.ratingSocial, 0) / reviews.length} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Review cards */}
                  <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-4">
                    {reviews.map(r => (
                      <motion.div key={r.id} variants={staggerItem}>
                        <Card className="rounded-2xl shadow-sm border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold shrink-0 shadow-sm shadow-blue-600/20">
                                  {r.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold dark:text-white">{r.userName}</span>
                                    {r.verifiedEnrollment && (
                                      <Badge variant="outline" className="text-[10px] gap-1 border-blue-500 text-blue-700 dark:text-blue-400 dark:border-blue-700">
                                        <CheckCircle2 className="size-3" />{t('reviews.verifiedStudent')}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1 dark:text-slate-400">
                                    <MapPin className="size-3" />{r.userCountry}
                                  </div>
                                </div>
                              </div>
                              <StarRating value={r.ratingOverall} />
                            </div>
                            <p className="text-sm leading-relaxed my-3 dark:text-slate-300">{r.reviewText}</p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {r.tags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] dark:bg-slate-800">{tag}</Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t dark:border-slate-700">
                              <span>{new Date(r.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                                <ThumbsUp className="size-3" />{t('reviews.helpful')} ({r.helpfulCount})
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Floating CTA — appears after scroll */}
      <AnimatePresence>
        {showFloatingCta && !contactOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md"
          >
            <button
              onClick={openContact}
              className="group w-full flex items-center gap-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-2xl shadow-slate-900/20 dark:shadow-black/40 p-3 text-left hover:border-orange-400 dark:hover:border-orange-500 transition-colors"
            >
              <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-500/30">
                <Mail className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t('contact.floatingCta')}</div>
                <div className="text-xs text-muted-foreground dark:text-slate-400 truncate">{t('contact.floatingCtaSub')}</div>
              </div>
              <div className="text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0 group-hover:translate-x-0.5 transition-transform">→</div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact form modal */}
      <ContactDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        universityId={uni.id}
        universityName={uni.name}
        profile={profile}
      />

      {/* Modals */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
      <ReviewForm open={reviewFormOpen} onClose={() => setReviewFormOpen(false)} universityId={uni.id} universityName={uni.name} onSubmitted={handleReviewSubmitted} />
    </div>
  )
}

// =================== Contact Dialog (Modal) ===================
function ContactDialog({
  open, onOpenChange, universityId, universityName, profile,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  universityId: string
  universityName: string
  profile: UserProfile | null
}) {
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

  React.useEffect(() => {
    if (profile) { setName(profile.name); setCountry(profile.country); setField(profile.fieldOfInterest ?? '') }
  }, [profile])

  // Reset submitted state when dialog closes
  React.useEffect(() => {
    if (!open) {
      const resetTimer = setTimeout(() => setSubmitted(false), 200)
      return () => clearTimeout(resetTimer)
    }
  }, [open])

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
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setSubmitted(false)} className="dark:border-slate-600">{t('sendAnother')}</Button>
              <Button onClick={() => onOpenChange(false)} className="bg-orange-500 hover:bg-orange-600 text-white">OK</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header — deep slate/navy gradient matching the hero (NO light blue) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-5 text-white">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-orange-500/20 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <div className="size-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <Mail className="size-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold leading-tight">{t('title', { name: universityName })}</h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">{t('description')}</p>
                </div>
              </div>
            </div>

            {/* Form body */}
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-xs dark:text-slate-300">{t('yourName')} *</Label>
                    <Input id="contact-name" value={name} onChange={e => setName(e.target.value)} required className="dark:bg-slate-800 dark:border-slate-700" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email" className="text-xs dark:text-slate-300">{t('email')} *</Label>
                    <Input id="contact-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="dark:bg-slate-800 dark:border-slate-700" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-country" className="text-xs dark:text-slate-300">{t('country')}</Label>
                    <Input id="contact-country" value={country} onChange={e => setCountry(e.target.value)} className="dark:bg-slate-800 dark:border-slate-700" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-gpa" className="text-xs dark:text-slate-300">{t('gpa')}</Label>
                    <Input id="contact-gpa" type="number" step="0.1" placeholder="3.5" value={gpa} onChange={e => setGpa(e.target.value)} className="dark:bg-slate-800 dark:border-slate-700" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-field" className="text-xs dark:text-slate-300">{t('fieldOfInterest')}</Label>
                    <Input id="contact-field" value={field} onChange={e => setField(e.target.value)} className="dark:bg-slate-800 dark:border-slate-700" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-msg" className="text-xs dark:text-slate-300">{t('yourMessage')} *</Label>
                  <Textarea id="contact-msg" rows={4} placeholder={t('messagePlaceholder')} value={message} onChange={e => setMessage(e.target.value)} required maxLength={2000} className="dark:bg-slate-800 dark:border-slate-700 resize-none" />
                </div>
                <Button type="submit" className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30" disabled={submitting}>
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
