'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft, Sparkles, MapPin, Wallet, GraduationCap,
  Globe, Clock, Target,
} from 'lucide-react'

type Match = {
  id: string
  relevanceScore: number
  explanation: string
  university: { id: string; name: string; slug: string; country: string; city: string }
  matchedProgram: { id: string; name: string; field: string } | null
}

type Session = {
  id: string
  language: string
  status: string
  nationality: string | null
  educationLevel: string | null
  fieldOfInterest: string | null
  preferredCountries: string[]
  budgetUsd: number | null
  languagePref: string | null
  degreeLevel: string | null
  careerGoal: string | null
  specialRequirements: string | null
  createdAt: string
  matches: Match[]
}

export function MyMatchesClient({ sessions }: { sessions: Session[] }) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-4" /> Back to EduPath
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">My AI matches</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your past Rihla sessions and the universities we matched you with.
            </p>
          </div>
          <Button asChild>
            <Link href="/agent">
              <Sparkles className="size-4 mr-1" /> Start a new session
            </Link>
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 border rounded-xl">
          <Sparkles className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Chat with Rihla, our AI advisor, to get personalized university recommendations
            based on your nationality, budget, field, and preferences.
          </p>
          <Button asChild>
            <Link href="/agent">Talk to Rihla</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session }: { session: Session }) {
  const [expanded, setExpanded] = React.useState(false)
  const date = new Date(session.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Clock className="size-4 text-muted-foreground" />
              <span className="font-semibold text-sm">{date}</span>
              <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                {session.status}
              </Badge>
              {session.matches.length > 0 && (
                <Badge variant="outline">
                  <Target className="size-3 mr-1" />
                  {session.matches.length} matches
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {session.nationality && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {session.nationality}
                </span>
              )}
              {session.fieldOfInterest && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="size-3" /> {session.fieldOfInterest}
                </span>
              )}
              {session.budgetUsd && (
                <span className="flex items-center gap-1">
                  <Wallet className="size-3" /> ${session.budgetUsd.toLocaleString()}/yr
                </span>
              )}
              {session.preferredCountries.length > 0 && (
                <span className="flex items-center gap-1">
                  <Globe className="size-3" /> {session.preferredCountries.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded matches */}
      {expanded && session.matches.length > 0 && (
        <div className="border-t px-5 py-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
          <h4 className="text-sm font-semibold">Matched universities</h4>
          <div className="space-y-3">
            {session.matches.map((m, i) => (
              <div key={m.id} className="bg-white dark:bg-slate-900 border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">#{i + 1}</span>
                      <Link
                        href={`/university/${m.university.slug}`}
                        className="font-medium hover:underline truncate"
                      >
                        {m.university.name}
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.university.city}, {m.university.country}
                      {m.matchedProgram && ` • ${m.matchedProgram.name}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {Math.round(m.relevanceScore)}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">match</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.explanation}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/agent">
              <Sparkles className="size-4 mr-1" /> Run a new search with updated preferences
            </Link>
          </Button>
        </div>
      )}

      {expanded && session.matches.length === 0 && (
        <div className="border-t px-5 py-5 text-center text-sm text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50">
          {session.status === 'completed'
            ? 'No matches were generated for this session. Try adjusting your preferences.'
            : 'This session was not completed. Chat with Rihla to finish your intake.'}
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/agent">Talk to Rihla</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
