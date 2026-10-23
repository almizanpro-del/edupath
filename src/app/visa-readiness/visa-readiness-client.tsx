'use client'

/**
 * Visa readiness checklist client. Stores progress in localStorage so
 * students can return without an account. If signed in, we could sync
 * to the DB (future enhancement).
 */
import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronLeft, FileText, Wallet, GraduationCap, User,
  Shield, AlertTriangle, Info, RotateCcw,
} from 'lucide-react'
import {
  VISA_DOCUMENTS,
  calculateVisaReadiness,
  type VisaDocument,
} from '@/lib/visa-readiness'

const STORAGE_KEY = 'edupath-visa-readiness'

const CATEGORY_META = {
  identity: { label: 'Identity & Personal', labelAr: 'الهوية والمعلومات الشخصية', icon: User, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
  academic: { label: 'Academic', labelAr: 'أكاديمي', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
  financial: { label: 'Financial Proof', labelAr: 'الإثبات المالي', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  supporting: { label: 'Supporting Documents', labelAr: 'المستندات الداعمة', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950' },
} as const

export function VisaReadinessClient({ userId }: { userId: string | null }) {
  const [completed, setCompleted] = React.useState<Set<string>>(new Set())
  const [loaded, setLoaded] = React.useState(false)

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setCompleted(new Set(JSON.parse(stored)))
      }
    } catch {
      // ignore
    }
    setLoaded(true)
  }, [])

  // Save to localStorage on change
  React.useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]))
    } catch {
      // ignore
    }
  }, [completed, loaded])

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const reset = () => {
    if (confirm('Reset all checkboxes? This cannot be undone.')) {
      setCompleted(new Set())
    }
  }

  const result = calculateVisaReadiness([...completed])

  const categories = ['identity', 'academic', 'financial', 'supporting'] as const

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-8">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="size-4" /> Back to EduPath
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="size-7 text-blue-600" />
          Visa Readiness Score
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your visa application documents and see your readiness score.
        </p>
      </div>

      {/* Score card */}
      <div className="border rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Your readiness score</div>
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl font-bold ${result.levelColor}`}>{result.totalScore}</span>
              <span className="text-2xl text-muted-foreground">/ 100</span>
            </div>
            <Badge variant="outline" className={`mt-2 ${result.levelColor} border-current`}>
              {result.levelLabel}
            </Badge>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${result.totalScore}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{result.completedDocs.length} of {VISA_DOCUMENTS.length} documents</span>
              <button onClick={reset} className="hover:text-foreground flex items-center gap-1">
                <RotateCcw className="size-3" /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {categories.map(cat => {
            const meta = CATEGORY_META[cat]
            const score = result.categoryScores[cat]
            const Icon = meta.icon
            return (
              <div key={cat} className={`${meta.bg} rounded-lg p-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`size-4 ${meta.color}`} />
                  <span className="text-xs font-medium">{meta.label}</span>
                </div>
                <div className={`text-lg font-bold ${meta.color}`}>
                  {score.score}/{score.max}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {score.completed}/{score.total} docs
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* DISCLAIMER — critical for compliance (PRD AI-08) */}
      <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-amber-800 dark:text-amber-200">
            This is NOT a visa approval predictor.
          </p>
          <p className="text-amber-700 dark:text-amber-300">
            This score reflects how many required documents you have prepared — not your likelihood
            of visa approval. Visa decisions depend on many factors including your personal circumstances,
            embassy policy, and country-specific requirements. Always consult the official embassy website
            and consider using a licensed immigration adviser.
          </p>
        </div>
      </div>

      {/* Document checklist by category */}
      <div className="space-y-6">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat]
          const docs = VISA_DOCUMENTS.filter(d => d.category === cat)
          const Icon = meta.icon
          return (
            <section key={cat} className="border rounded-xl overflow-hidden">
              <div className={`${meta.bg} px-4 py-3 flex items-center gap-2`}>
                <Icon className={`size-4 ${meta.color}`} />
                <h3 className="font-semibold text-sm">{meta.label}</h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  {result.categoryScores[cat].completed}/{result.categoryScores[cat].total} completed
                </span>
              </div>
              <div className="divide-y">
                {docs.map(doc => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    checked={completed.has(doc.id)}
                    onToggle={() => toggle(doc.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Missing required docs summary */}
      {result.missingRequired.length > 0 && (
        <div className="border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 rounded-xl p-4">
          <h3 className="font-semibold text-sm text-rose-800 dark:text-rose-200 mb-2 flex items-center gap-1">
            <AlertTriangle className="size-4" /> Missing required documents ({result.missingRequired.length})
          </h3>
          <ul className="space-y-1 text-sm text-rose-700 dark:text-rose-300">
            {result.missingRequired.map(d => (
              <li key={d.id} className="flex items-start gap-2">
                <span className="text-rose-400">•</span>
                <span>{d.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next steps CTA */}
      <div className="border rounded-xl p-6 text-center">
        <Info className="size-8 text-blue-600 mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Need help preparing your documents?</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Chat with Rihla AI for guidance on what each document is and how to get it, or browse universities
          with clear application requirements.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button asChild variant="outline" size="sm">
            <Link href="/agent">Talk to Rihla AI</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/">Browse universities</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function DocRow({
  doc,
  checked,
  onToggle,
}: {
  doc: VisaDocument
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm ${checked ? 'line-through text-muted-foreground' : 'font-medium'}`}>
            {doc.label}
          </span>
          {doc.required ? (
            <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-300">Required</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] text-slate-500">Optional</Badge>
          )}
          <Badge variant="outline" className="text-[9px] text-blue-600 border-blue-300">
            {doc.weight} pts
          </Badge>
        </div>
      </div>
    </div>
  )
}
