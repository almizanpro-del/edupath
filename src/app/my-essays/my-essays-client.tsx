'use client'

/**
 * Client component for the /my-essays page.
 * Renders the usage summary + a list of expandable essay review cards.
 */
import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronDown, FileText, TrendingUp, Sparkles } from 'lucide-react'

type Feedback = {
  scores: { structure: number; tone: number; clarity: number; cultural_fit: number }
  overall_score: number
  strengths: string[]
  weaknesses: string[]
  line_feedback: Array<{ quote: string; issue: string; suggestion: string }>
  rewrite_summary: string
}

type Review = {
  id: string
  essayText: string
  feedback: Feedback
  overallScore: number
  targetUniversity: string | null
  targetProgram: string | null
  applicantCountry: string | null
  createdAt: string
}

type Usage = { used: number; limit: number; tier: string }

const DIMENSIONS: Array<{ key: keyof Feedback['scores']; label: string; color: string }> = [
  { key: 'structure', label: 'Structure', color: 'bg-blue-500' },
  { key: 'tone', label: 'Tone', color: 'bg-purple-500' },
  { key: 'clarity', label: 'Clarity', color: 'bg-emerald-500' },
  { key: 'cultural_fit', label: 'Cultural Fit', color: 'bg-amber-500' },
]

export function MyEssaysClient({ reviews, usage }: { reviews: Review[]; usage: Usage }) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-4" /> Back to EduPath
        </Link>
        <h1 className="text-3xl font-bold">My essay reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your progress and revisit past feedback.
        </p>
      </div>

      {/* Usage summary */}
      <section className="border rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-4 text-blue-600" />
              <h2 className="text-lg font-semibold">This month</h2>
              <Badge variant="outline" className="capitalize">{usage.tier}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {usage.limit === -1
                ? `Unlimited reviews on the ${usage.tier} plan. You've used ${usage.used} this month.`
                : `You've used ${usage.used} of ${usage.limit} review${usage.limit !== 1 ? 's' : ''} this month.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {usage.limit !== -1 && usage.used >= usage.limit && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/pricing">Upgrade for more</Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href="/essay-review">
                <FileText className="size-4 mr-1" /> Review a new essay
              </Link>
            </Button>
          </div>
        </div>
        {usage.limit !== -1 && (
          <div className="mt-4">
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-16 border rounded-xl">
          <FileText className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Submit your first essay and our AI will give you detailed feedback on structure,
            tone, clarity, and cultural fit — plus line-level suggestions.
          </p>
          <Button asChild>
            <Link href="/essay-review">Review your first essay</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <EssayReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function EssayReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = React.useState(false)
  const date = new Date(review.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const feedback = review.feedback

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{date}</span>
              {review.targetUniversity && (
                <Badge variant="outline">{review.targetUniversity}</Badge>
              )}
              {review.targetProgram && (
                <Badge variant="secondary">{review.targetProgram}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {review.essayText.slice(0, 150)}…
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {review.overallScore.toFixed(1)}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">Overall</div>
            </div>
            <ChevronDown
              className={`size-5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 py-5 space-y-5 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Score breakdown */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
              <TrendingUp className="size-4" /> Score breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DIMENSIONS.map(d => (
                <div key={d.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium">{feedback.scores[d.key]}/5</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${d.color}`}
                      style={{ width: `${(feedback.scores[d.key] / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths + Weaknesses */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 text-emerald-700 dark:text-emerald-400">Strengths</h4>
              <ul className="space-y-1 text-sm">
                {feedback.strengths?.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-600">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2 text-rose-700 dark:text-rose-400">Areas to improve</h4>
              <ul className="space-y-1 text-sm">
                {feedback.weaknesses?.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-rose-600">−</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Line feedback */}
          {feedback.line_feedback?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Line-by-line feedback</h4>
              <div className="space-y-3">
                {feedback.line_feedback.map((lf, i) => (
                  <div key={i} className="border-l-2 border-blue-300 pl-3 text-sm space-y-1">
                    <p className="italic text-muted-foreground">“{lf.quote}”</p>
                    <p><span className="font-medium">Issue:</span> {lf.issue}</p>
                    <p><span className="font-medium">Suggestion:</span> {lf.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewrite summary */}
          {feedback.rewrite_summary && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <h4 className="text-sm font-semibold mb-1">Summary</h4>
              <p className="text-sm">{feedback.rewrite_summary}</p>
            </div>
          )}

          {/* Full essay */}
          <details>
            <summary className="text-sm font-medium cursor-pointer hover:underline">
              Read the full essay
            </summary>
            <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {review.essayText}
            </p>
          </details>
        </div>
      )}
    </div>
  )
}
