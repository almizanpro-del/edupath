'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, DollarSign, Star, Heart, ArrowLeftRight, CheckCircle2, MapPin, Users, TrendingUp, Languages, Clock, ExternalLink, ThumbsUp, Calculator, MessageSquarePlus } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatUsd, formatUsdCompact, totalCost, countryFlagUrl } from '@/lib/edupath'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { ReviewForm } from '@/components/edupath/review-form'
import { createClient } from '@/lib/supabase/client'

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
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
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
  const [compareList, setCompareList] = React.useState<University[]>([])
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [reviewFormOpen, setReviewFormOpen] = React.useState(false)
  const [reviews, setReviews] = React.useState<Review[]>(uni.reviews)

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setIsSaved(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load saved state
  React.useEffect(() => {
    if (!profile) return
    fetch('/api/saved-lists')
      .then(r => r.ok ? r.json() : { universities: [] })
      .then(data => {
        const saved = new Set<string>((data.universities ?? []).map((u: { id: string }) => u.id))
        setIsSaved(saved.has(uni.id))
      })
      .catch(() => {})
  }, [profile, uni.id])

  const handleSave = async () => {
    if (!profile) {
      toast({ title: 'Sign in to save universities', description: 'Create a free account to bookmark universities.' })
      setAuthModalOpen(true)
      return
    }
    const wasSaved = isSaved
    setIsSaved(!wasSaved)
    try {
      const res = await fetch('/api/saved-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universityId: uni.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: data.action === 'saved' ? 'Saved to your list' : 'Removed from saved list', description: uni.name })
    } catch {
      setIsSaved(wasSaved)
      toast({ title: 'Failed to save', variant: 'destructive' })
    }
  }

  const handleCompare = () => {
    if (isComparing) {
      setIsComparing(false)
      toast({ title: 'Removed from comparison', description: uni.name })
    } else {
      setIsComparing(true)
      toast({ title: 'Added to comparison', description: uni.name })
    }
  }

  const openReviewForm = () => {
    if (!profile) {
      toast({ title: 'Sign in to write a review', description: 'Reviews help other MENA students make informed decisions.' })
      setAuthModalOpen(true)
      return
    }
    setReviewFormOpen(true)
  }

  const handleReviewSubmitted = async () => {
    // Refetch reviews for this university
    try {
      const res = await fetch(`/api/reviews?universityId=${uni.id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.reviews) setReviews(data.reviews)
    } catch {}
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.ratingOverall, 0) / reviews.length : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">{t('back') || 'Back'}</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={isComparing ? 'default' : 'outline'} onClick={handleCompare} className="gap-2">
              <ArrowLeftRight className="size-4" />
              {isComparing ? t('inCompare') : t('addToCompare')}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSave} className="gap-2">
              <Heart className={cn('size-4', isSaved && 'fill-rose-500 text-rose-500')} />
              {isSaved ? t('saved') : t('save')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero header */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-900 to-blue-950 text-white">
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-start gap-4">
            <div className="size-16 rounded-xl bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
              <Image
                src={countryFlagUrl(uni.country, 80)}
                alt={uni.country}
                width={48}
                height={32}
                className="rounded"
                unoptimized
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{uni.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/85">
                <span className="flex items-center gap-1"><MapPin className="size-4" /> {uni.city}, {uni.country}</span>
                <a href={uni.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                  <ExternalLink className="size-4" /> {t('visitWebsite')}
                </a>
                {avgRating !== null && (
                  <span className="flex items-center gap-1">
                    <Star className="size-4 fill-amber-300 text-amber-300" />
                    {avgRating.toFixed(1)} ({reviews.length})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent h-12 p-0 gap-6 border-b w-full justify-start rounded-none">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="programs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">{t('tabs.programs')} ({uni.programs.length})</TabsTrigger>
            <TabsTrigger value="scholarships" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">{t('tabs.scholarships')} ({uni.scholarships.length})</TabsTrigger>
            <TabsTrigger value="cost" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">{t('tabs.cost')}</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">{t('tabs.reviews')} ({reviews.length})</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <p className="text-base leading-relaxed">{uni.descriptionEn}</p>
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<DollarSign className="size-4" />} label={t('stats.cheapestProgram')} value={formatUsd(uni.cheapestProgramTuition) + '/yr'} />
                <StatCard icon={<DollarSign className="size-4" />} label={t('stats.livingCost')} value={formatUsd(uni.livingCostUsd) + '/yr'} />
                <StatCard icon={<Users className="size-4" />} label={t('stats.intlStudents')} value={uni.intlStudentPct + '%'} />
                <StatCard icon={<TrendingUp className="size-4" />} label={t('stats.acceptance')} value={uni.acceptanceRate !== null ? uni.acceptanceRate + '%' : 'N/A'} />
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2 text-sm">{t('descriptionAr')}</h4>
                <p className="text-base leading-relaxed text-right" dir="rtl" lang="ar">{uni.descriptionAr}</p>
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
                          <Badge variant="outline" className="text-xs"><Languages className="size-3 mr-1" />{p.language}</Badge>
                        </div>
                        <h4 className="font-semibold">{p.name}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-700">{formatUsd(p.tuitionUsd)}</div>
                        <div className="text-xs text-muted-foreground">{t('programs.perYear')}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {p.durationMonths} {t('programs.months')}</span>
                      {p.deadline && <span className="flex items-center gap-1"><CalendarIcon className="size-3" /> {t('programs.deadline')}: {p.deadline}</span>}
                    </div>
                    {p.entryReqs && (
                      <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
                        <strong>{t('programs.entryRequirements')}:</strong> {p.entryReqs}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="scholarships" className="mt-0 space-y-3">
              {uni.scholarships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">{t('scholarships.none')}</div>
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
                          <div className="text-xs text-muted-foreground">{s.amountType === 'full' ? t('scholarships.fullCoverage') : t('scholarships.amount')}</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.eligibility}</p>
                      {s.deadline && (
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <CalendarIcon className="size-3" /> {t('scholarships.applyBy')}: {s.deadline}
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
                  <Calculator className="size-4" /> {t('cost.title')}
                </h4>
                <p className="text-sm text-muted-foreground mb-4">{t('cost.description')}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium">{t('cost.programDuration', { months: costDuration, years: (costDuration / 12).toFixed(1) })}</Label>
                  <Slider value={[costDuration]} onValueChange={(v) => setCostDuration(v[0])} min={12} max={72} step={6} className="mt-3" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{t('cost.1year')}</span>
                    <span>{t('cost.6years')}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-living" checked={includeLiving} onCheckedChange={(v) => setIncludeLiving(v === true)} />
                  <Label htmlFor="include-living" className="text-sm cursor-pointer">
                    {t('cost.includeLiving', { amount: formatUsd(uni.livingCostUsd) })}
                  </Label>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('cost.tuition', { years: (costDuration / 12).toFixed(1) })}</span>
                    <span className="font-medium">{formatUsd(Math.round(uni.cheapestProgramTuition * costDuration / 12))}</span>
                  </div>
                  {includeLiving && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('cost.living', { years: (costDuration / 12).toFixed(1) })}</span>
                      <span className="font-medium">{formatUsd(Math.round(uni.livingCostUsd * costDuration / 12))}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold">{t('cost.total')}</span>
                    <span className="text-2xl font-bold text-emerald-700">
                      {formatUsd(totalCost(uni.cheapestProgramTuition, includeLiving ? uni.livingCostUsd : 0, costDuration))}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-3">
                <strong>{t('cost.disclaimer')}</strong>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-0 space-y-4">
              {/* Write a review CTA */}
              <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div>
                  <div className="font-semibold text-sm">{t('reviews.shareExperience')}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {profile ? t('reviews.shareDescLoggedIn') : t('reviews.shareDescLoggedOut')}
                  </div>
                </div>
                <Button onClick={openReviewForm} className="gap-2" size="sm">
                  <MessageSquarePlus className="size-4" />
                  {t('reviews.writeReview')}
                </Button>
              </div>

              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">✍️</div>
                  <h4 className="font-semibold mb-1">{t('reviews.noReviews')}</h4>
                  <p className="text-sm text-muted-foreground">{t('reviews.noReviewsDesc', { name: uni.name })}</p>
                </div>
              ) : (
                <>
                  {avgRating !== null && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-3xl font-bold">{avgRating.toFixed(1)}</div>
                          <StarRating value={avgRating} size={16} />
                          <div className="text-xs text-muted-foreground mt-1">{t('reviews.reviewCount', { count: reviews.length })}</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <RatingBar label={t('reviews.subRatings.affordability')} value={reviews.reduce((s, r) => s + r.ratingAffordability, 0) / reviews.length} />
                        <RatingBar label={t('reviews.subRatings.teaching')} value={reviews.reduce((s, r) => s + r.ratingTeaching, 0) / reviews.length} />
                        <RatingBar label={t('reviews.subRatings.visa')} value={reviews.reduce((s, r) => s + r.ratingVisa, 0) / reviews.length} />
                        <RatingBar label={t('reviews.subRatings.safety')} value={reviews.reduce((s, r) => s + r.ratingSafety, 0) / reviews.length} />
                        <RatingBar label={t('reviews.subRatings.social')} value={reviews.reduce((s, r) => s + r.ratingSocial, 0) / reviews.length} />
                      </div>
                    </div>
                  )}
                  {reviews.map(r => (
                    <Card key={r.id} className="py-4">
                      <CardContent>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{r.userName}</span>
                              {r.verifiedEnrollment && (
                                <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500 text-emerald-700">
                                  <CheckCircle2 className="size-3" /> {t('reviews.verifiedStudent')}
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
                          <span>{new Date(r.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                            <ThumbsUp className="size-3" /> {t('reviews.helpful')} ({r.helpfulCount})
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Auth + Review modals */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
      <ReviewForm
        open={reviewFormOpen}
        onClose={() => setReviewFormOpen(false)}
        universityId={uni.id}
        universityName={uni.name}
        onSubmitted={handleReviewSubmitted}
      />
    </div>
  )
}
