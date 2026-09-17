'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Award, Sparkles, TrendingUp, Lightbulb, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatUsd } from '@/lib/edupath'
import { cn } from '@/lib/utils'

type Match = {
  scholarshipId: string
  matchScore: number
  reasoning: string
  tips: string
  scholarship: {
    id: string
    name: string
    amountUsd: number
    amountType: string
    eligibility: string
    deadline: string | null
    universityName: string
    universityCountry: string
  }
}

export function ScholarshipMatcherClient({ totalScholarships }: { totalScholarships: number }) {
  const router = useRouter()
  const { toast } = useToast()
  const [gpa, setGpa] = React.useState('')
  const [field, setField] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [languageScore, setLanguageScore] = React.useState('')
  const [budget, setBudget] = React.useState('')
  const [degreeLevel, setDegreeLevel] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [matches, setMatches] = React.useState<Match[]>([])

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gpa || !field) {
      toast({ title: 'GPA and field are required', variant: 'destructive' })
      return
    }
    setLoading(true)
    setMatches([])
    try {
      const res = await fetch('/api/scholarship-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gpa, field, country, languageScore, budget, degreeLevel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error)
      setMatches(data.matches)
      if (data.matches.length === 0) {
        toast({ title: 'No matches found', description: 'Try adjusting your profile.' })
      } else {
        toast({ title: `${data.matches.length} matches found!` })
      }
    } catch (err) {
      toast({ title: 'Matching failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    }
    setLoading(false)
  }

  const scoreColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-700', bar: 'bg-emerald-500' }
    if (score >= 70) return { bg: 'bg-teal-50 border-teal-300', text: 'text-teal-700', bar: 'bg-teal-500' }
    return { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-700', bar: 'bg-amber-500' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back to directory</span>
          </Button>
          <div className="flex items-center gap-2">
            <Award className="size-5 text-emerald-600" />
            <span className="font-bold">Financial Aid Matcher</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">
            <Sparkles className="size-4" />
            AI-Powered Matching
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Find scholarships you actually qualify for
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Enter your profile and our AI matches you with {totalScholarships} scholarships across our university network.
            Get match scores and application tips for each.
          </p>
        </div>

        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
          {/* Form */}
          <Card className="h-fit lg:sticky lg:top-20">
            <CardContent className="pt-6">
              <form onSubmit={handleMatch} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="gpa" className="text-xs">GPA (4.0 scale) *</Label>
                    <Input id="gpa" type="number" step="0.1" min="0" max="4" placeholder="3.5" value={gpa} onChange={e => setGpa(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="field" className="text-xs">Field of Study *</Label>
                    <Select value={field} onValueChange={setField}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['Computer Science', 'Engineering', 'Business', 'Medicine', 'Social Sciences', 'Arts & Humanities'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-xs">Your Country</Label>
                    <Input id="country" type="text" placeholder="Jordan" value={country} onChange={e => setCountry(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lang" className="text-xs">IELTS/TOEFL</Label>
                    <Input id="lang" type="text" placeholder="IELTS 6.5" value={languageScore} onChange={e => setLanguageScore(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="budget" className="text-xs">Budget (USD/yr)</Label>
                    <Input id="budget" type="number" placeholder="10000" value={budget} onChange={e => setBudget(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="degree" className="text-xs">Degree Level</Label>
                    <Select value={degreeLevel} onValueChange={setDegreeLevel}>
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {['bachelor', 'master', 'phd'].map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? <><Loader2 className="size-4 animate-spin" /> Matching...</> : <><Sparkles className="size-4" /> Find My Matches</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          <div>
            {loading && (
              <Card className="flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center py-12">
                  <Loader2 className="size-12 animate-spin text-emerald-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">AI is matching your profile...</h3>
                  <p className="text-sm text-muted-foreground">Analyzing {totalScholarships} scholarships against your profile. This takes 10-20 seconds.</p>
                </CardContent>
              </Card>
            )}

            {!loading && matches.length === 0 && (
              <Card className="flex items-center justify-center min-h-[400px] border-dashed">
                <CardContent className="text-center py-12">
                  <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <Award className="size-8 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Your matches will appear here</h3>
                  <p className="text-sm text-muted-foreground">Fill in your profile and click "Find My Matches" to get AI-powered scholarship recommendations.</p>
                </CardContent>
              </Card>
            )}

            {!loading && matches.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{matches.length} scholarship matches</h2>
                  <Badge variant="outline" className="gap-1"><TrendingUp className="size-3" /> Sorted by match score</Badge>
                </div>
                {matches.map((m, i) => {
                  const colors = scoreColor(m.matchScore)
                  return (
                    <Card key={m.scholarshipId} className={cn('border-2', colors.bg)}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                              <h3 className="font-semibold">{m.scholarship.name}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">{m.scholarship.universityName} · {m.scholarship.universityCountry}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={cn('text-3xl font-bold', colors.text)}>{m.matchScore}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">match</div>
                          </div>
                        </div>

                        {/* Amount + deadline */}
                        <div className="flex flex-wrap gap-3 mb-3">
                          <Badge variant="secondary" className="gap-1">
                            <DollarSign className="size-3" />
                            {formatUsd(m.scholarship.amountUsd)}
                            {m.scholarship.amountType === 'full' && ' (full)'}
                          </Badge>
                          {m.scholarship.deadline && (
                            <Badge variant="outline" className="text-xs">Deadline: {m.scholarship.deadline}</Badge>
                          )}
                        </div>

                        {/* Match progress bar */}
                        <div className="mb-3">
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', colors.bar)} style={{ width: `${m.matchScore}%` }} />
                          </div>
                        </div>

                        {/* AI reasoning */}
                        <div className="text-sm text-slate-700 mb-2">
                          <strong>Why this matches:</strong> {m.reasoning}
                        </div>

                        {/* Tips */}
                        <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 flex items-start gap-2">
                          <Lightbulb className="size-3 text-blue-600 mt-0.5 shrink-0" />
                          <span><strong>Tip:</strong> {m.tips}</span>
                        </div>

                        {/* Eligibility */}
                        <details className="mt-2 text-xs text-muted-foreground">
                          <summary className="cursor-pointer font-medium">Eligibility criteria</summary>
                          <p className="mt-1">{m.scholarship.eligibility}</p>
                        </details>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
