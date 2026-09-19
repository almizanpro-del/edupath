'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Star, CheckCircle2, AlertCircle, Lightbulb, PenLine, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics-client'
import { useTranslations } from 'next-intl'

type University = { id: string; name: string; country: string }

type Review = {
  scores: {
    structure: number
    tone: number
    clarity: number
    cultural_fit: number
  }
  overall_score: number
  strengths: string[]
  weaknesses: string[]
  line_feedback: Array<{
    quote: string
    issue: string
    suggestion: string
  }>
  rewrite_summary: string
}

const DIMENSIONS = [
  { key: 'structure', label: 'Structure', icon: '📐', hint: 'Organization, thesis, transitions' },
  { key: 'tone', label: 'Tone', icon: '🎯', hint: 'Confidence, specificity, no cliches' },
  { key: 'clarity', label: 'Clarity', icon: '✨', hint: 'Precision, no redundancy, rhythm' },
  { key: 'cultural_fit', label: 'Cultural Fit', icon: '🌍', hint: 'University-specific research' },
] as const

export function EssayReviewClient({ universities }: { universities: University[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('EssayReview')

  const [essayText, setEssayText] = React.useState('')
  const [targetUniversity, setTargetUniversity] = React.useState('')
  const [targetProgram, setTargetProgram] = React.useState('')
  const [applicantCountry, setApplicantCountry] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [review, setReview] = React.useState<Review | null>(null)
  const [remaining, setRemaining] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)

  // Check auth on mount
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch('/api/me').then(r => r.json()).then(data => {
          if (data.profile) {
            setProfile(data.profile)
            setApplicantCountry(data.profile.country)
          }
        }).catch(() => {})
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const charCount = essayText.length
  const minChars = 50
  const maxChars = 10000
  const canSubmit = essayText.trim().length >= minChars && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) {
      toast({
        title: 'Sign in required',
        description: 'Create a free account to get AI feedback on your essay.',
      })
      setAuthModalOpen(true)
      return
    }
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    setReview(null)

    try {
      const res = await fetch('/api/essay-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayText,
          targetUniversity,
          targetProgram,
          applicantCountry,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.message || 'Rate limit exceeded. Please try again later.')
        } else {
          setError(data.message || data.error || 'Review failed')
        }
        return
      }

      setReview(data.review)
      setRemaining(data.remaining)
      track('essay_review', { metadata: { overallScore: data.review.overall_score, targetUniversity } })
      toast({
        title: 'Review complete!',
        description: `Overall score: ${data.review.overall_score}/5`,
      })
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEssayText('')
    setReview(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{t('back')}</span>
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-blue-600" />
            <span className="font-bold">{t('title')}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
            <Sparkles className="size-4" />
            {t('badge')}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {t('heading')}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Rate limit badge */}
        {profile && remaining !== null && (
          <div className="flex justify-center mb-6">
            <Badge variant="outline" className="gap-2 px-3 py-1">
              <FileText className="size-3" />
              {t('reviewsRemaining', { count: remaining })}
            </Badge>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="size-5 text-blue-600" />
                  {t('yourEssay')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Context fields */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="university" className="text-xs">{t('targetUniversity')}</Label>
                      <Select value={targetUniversity} onValueChange={setTargetUniversity}>
                        <SelectTrigger id="university" className="h-9">
                          <SelectValue placeholder={t('selectUniversity')} />
                        </SelectTrigger>
                        <SelectContent>
                          {universities.map(u => (
                            <SelectItem key={u.id} value={u.name}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="program" className="text-xs">{t('targetProgram')}</Label>
                      <Input
                        id="program"
                        type="text"
                        placeholder="e.g. BSc Computer Science"
                        value={targetProgram}
                        onChange={(e) => setTargetProgram(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-xs">{t('yourCountry')}</Label>
                    <Input
                      id="country"
                      type="text"
                      placeholder="e.g. Jordan"
                      value={applicantCountry}
                      onChange={(e) => setApplicantCountry(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <Separator />

                  {/* Essay textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="essay" className="text-sm font-medium">
                        {t('pasteEssay')}
                      </Label>
                      <span className={cn(
                        'text-xs',
                        charCount < minChars ? 'text-muted-foreground' : charCount > maxChars ? 'text-rose-500' : 'text-blue-600'
                      )}>
                        {charCount.toLocaleString()} / {maxChars.toLocaleString()}
                      </span>
                    </div>
                    <Textarea
                      id="essay"
                      placeholder={t('pasteEssayPlaceholder')}
                      value={essayText}
                      onChange={(e) => setEssayText(e.target.value)}
                      rows={12}
                      maxLength={maxChars}
                      className="resize-y"
                    />
                    {charCount > 0 && charCount < minChars && (
                      <p className="text-xs text-muted-foreground">
                        {t('moreCharsNeeded', { count: minChars - charCount })}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                      disabled={!canSubmit}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          {t('reviewing')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4" />
                          {t('reviewMyEssay')}
                        </>
                      )}
                    </Button>
                    {(review || error) && (
                      <Button type="button" variant="outline" onClick={resetForm}>
                        {t('reset')}
                      </Button>
                    )}
                  </div>

                  {!profile && (
                    <p className="text-xs text-muted-foreground text-center">
                      {t('signInNote')}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div>
            {loading && (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center py-12">
                  <Loader2 className="size-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{t('aiReviewing')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('aiReviewingDesc')}
                  </p>
                </CardContent>
              </Card>
            )}

            {error && !loading && (
              <Card className="h-full flex items-center justify-center min-h-[400px] border-rose-200">
                <CardContent className="text-center py-12">
                  <AlertCircle className="size-12 text-rose-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{t('reviewFailed')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button onClick={handleSubmit} variant="outline">{t('tryAgain')}</Button>
                </CardContent>
              </Card>
            )}

            {review && !loading && !error && (
              <ReviewResults review={review} essayText={essayText} />
            )}

            {!loading && !error && !review && (
              <Card className="h-full flex items-center justify-center min-h-[400px] border-dashed">
                <CardContent className="text-center py-12">
                  <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="size-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t('resultsAppear')}</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {t('resultsAppearDesc')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t('howItWorks')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DIMENSIONS.map(dim => (
              <Card key={dim.key}>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl mb-2">{dim.icon}</div>
                  <h3 className="font-semibold mb-1">{dim.label}</h3>
                  <p className="text-xs text-muted-foreground">{dim.hint}</p>
                  <div className="mt-3 flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} className="size-3 text-amber-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthed={(p) => {
          setProfile(p)
          setApplicantCountry(p.country)
        }}
      />
    </div>
  )
}

// =================== Review Results Component ===================
function ReviewResults({ review, essayText }: { review: Review; essayText: string }) {
  const scoreColor = (score: number) => {
    if (score >= 4) return 'text-blue-600'
    if (score >= 3) return 'text-amber-600'
    return 'text-rose-600'
  }

  const scoreBg = (score: number) => {
    if (score >= 4) return 'bg-blue-50 border-blue-200'
    if (score >= 3) return 'bg-amber-50 border-amber-200'
    return 'bg-rose-50 border-rose-200'
  }

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <Card className={cn('border-2', scoreBg(review.overall_score))}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Overall Score</div>
              <div className={cn('text-5xl font-bold', scoreColor(review.overall_score))}>
                {review.overall_score}<span className="text-2xl text-muted-foreground">/5</span>
              </div>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <Star
                  key={n}
                  className={cn(
                    'size-8',
                    n <= review.overall_score ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                  )}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension scores */}
      <div className="grid grid-cols-2 gap-3">
        {DIMENSIONS.map(dim => {
          const score = review.scores[dim.key]
          return (
            <Card key={dim.key} className={cn('border', scoreBg(score))}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{dim.icon} {dim.label}</span>
                  <span className={cn('text-lg font-bold', scoreColor(score))}>{score}/5</span>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <div
                      key={n}
                      className={cn(
                        'flex-1 h-1.5 rounded-full',
                        n <= score ? (score >= 4 ? 'bg-blue-500' : score >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-200'
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Strengths */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-5 text-blue-600" />
            Strengths
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {review.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Weaknesses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="size-5 text-amber-600" />
            Areas for Improvement
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {review.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-amber-600 mt-0.5">→</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Line feedback */}
      {review.line_feedback.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-5 text-blue-600" />
              Line-by-Line Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {review.line_feedback.map((fb, i) => (
              <div key={i} className="border-l-2 border-blue-300 pl-3 space-y-1">
                <div className="text-sm italic text-slate-600 bg-slate-50 rounded px-2 py-1">
                  "{fb.quote}"
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>Issue:</strong> {fb.issue}
                </div>
                <div className="text-xs text-blue-700">
                  <strong>Suggestion:</strong> {fb.suggestion}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rewrite summary */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-5 text-blue-600" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm leading-relaxed">{review.rewrite_summary}</p>
        </CardContent>
      </Card>
    </div>
  )
}
