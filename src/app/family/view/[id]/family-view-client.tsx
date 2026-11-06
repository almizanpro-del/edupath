'use client'

/**
 * Parent's simplified dashboard client.
 * Shows only what the student has permitted via the invitation permissions.
 * Read-only — no edit actions.
 */
import * as React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft, Users, Wallet, Calendar, Shield, GraduationCap,
  MapPin, Clock, AlertTriangle, CheckCircle2, FileText,
} from 'lucide-react'

type Permissions = {
  canSeeCosts: boolean
  canSeeDeadlines: boolean
  canSeeSafety: boolean
  canSeeAcademic: boolean
  canSeeDocuments: boolean
}

type Student = {
  name: string
  country: string
  fieldOfInterest: string | null
  educationLevel: string | null
  preferredCountries: string[]
  budgetUsd: number | null
  gpa: number | null
  englishLevel: string | null
  intake: string | null
}

type SavedUniversity = {
  id: string; name: string; slug: string; country: string; city: string
  tuitionUsd: number; livingCostUsd: number
}

type Application = {
  id: string
  status: string
  decision: string | null
  deadlineAt: string | null
  notes: string
  updatedAt: string
  university: {
    id: string; name: string; slug: string; country: string; city: string
    tuitionUsd: number; livingCostUsd: number
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  researching: { label: 'Researching', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  applying: { label: 'Applying', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  submitted: { label: 'Submitted', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  interviewing: { label: 'Interviewing', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  decision: { label: 'Decision', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  enrolled: { label: 'Enrolled', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
}

const DECISION_LABELS: Record<string, { label: string; color: string }> = {
  accepted: { label: 'Accepted', color: 'bg-emerald-600 text-white' },
  rejected: { label: 'Rejected', color: 'bg-rose-600 text-white' },
  waitlisted: { label: 'Waitlisted', color: 'bg-amber-500 text-white' },
  deferred: { label: 'Deferred', color: 'bg-slate-500 text-white' },
}

export function FamilyViewClient({
  invitation,
  student,
  savedUniversities,
  applications,
}: {
  invitation: Permissions
  student: Student
  savedUniversities: SavedUniversity[]
  applications: Application[]
}) {
  const formatUsd = (n: number) => `$${n.toLocaleString()}`

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-6">
      <div>
        <Link
          href="/family"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-4" /> Back to Family Room
        </Link>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <Users className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{student.name}'s Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              A simplified view for family members
            </p>
          </div>
        </div>
      </div>

      {/* Student overview */}
      <section className="border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Student overview
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">From</span>
            <p className="font-medium">{student.country}</p>
          </div>
          {invitation.canSeeAcademic && (
            <>
              <div>
                <span className="text-muted-foreground">Education level</span>
                <p className="font-medium capitalize">{student.educationLevel?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Field of interest</span>
                <p className="font-medium">{student.fieldOfInterest || '—'}</p>
              </div>
              {student.gpa && (
                <div>
                  <span className="text-muted-foreground">GPA</span>
                  <p className="font-medium">{student.gpa} / 5.0</p>
                </div>
              )}
              {student.englishLevel && (
                <div>
                  <span className="text-muted-foreground">English level</span>
                  <p className="font-medium">{student.englishLevel}</p>
                </div>
              )}
              {student.intake && (
                <div>
                  <span className="text-muted-foreground">Intended intake</span>
                  <p className="font-medium capitalize">{student.intake.replace('_', ' ')}</p>
                </div>
              )}
            </>
          )}
          {student.preferredCountries.length > 0 && (
            <div>
              <span className="text-muted-foreground">Preferred destinations</span>
              <p className="font-medium">{student.preferredCountries.join(', ')}</p>
            </div>
          )}
        </div>
      </section>

      {/* Budget & costs (if permitted) */}
      {invitation.canSeeCosts && (
        <section className="border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="size-4 text-emerald-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Budget & costs</h2>
          </div>
          {student.budgetUsd ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Annual budget</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatUsd(student.budgetUsd)}/year
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Includes tuition + living expenses
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No budget set yet.</p>
          )}
        </section>
      )}

      {/* Applications with deadlines (if permitted) */}
      {invitation.canSeeDeadlines && (
        <section className="border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="size-4 text-blue-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Applications ({applications.length})
            </h2>
          </div>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {student.name} hasn't started tracking applications yet.
            </p>
          ) : (
            <div className="space-y-3">
              {applications.map(app => {
                const statusMeta = STATUS_LABELS[app.status] || STATUS_LABELS.researching
                const decisionMeta = app.decision ? DECISION_LABELS[app.decision] : null
                const deadline = app.deadlineAt ? new Date(app.deadlineAt) : null
                const daysToDeadline = deadline
                  ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null

                return (
                  <div key={app.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link
                        href={`/university/${app.university.slug}`}
                        className="font-medium hover:underline"
                      >
                        {app.university.name}
                      </Link>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[9px] ${statusMeta.color}`}>
                          {statusMeta.label}
                        </Badge>
                        {decisionMeta && (
                          <Badge className={`text-[9px] ${decisionMeta.color}`}>
                            {decisionMeta.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" /> {app.university.city}, {app.university.country}
                      </span>
                      {invitation.canSeeCosts && (
                        <span>{formatUsd(app.university.tuitionUsd)}/yr tuition</span>
                      )}
                    </div>
                    {deadline && (
                      <div className={`text-xs mt-2 flex items-center gap-1 ${
                        daysToDeadline !== null && daysToDeadline < 7
                          ? 'text-rose-600 font-medium'
                          : 'text-muted-foreground'
                      }`}>
                        <Clock className="size-3" />
                        {daysToDeadline !== null && daysToDeadline > 0
                          ? `${daysToDeadline} days to deadline`
                          : daysToDeadline === 0
                            ? 'Deadline is today!'
                            : 'Deadline passed'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Saved universities */}
      <section className="border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="size-4 text-purple-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Saved universities ({savedUniversities.length})
          </h2>
        </div>
        {savedUniversities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {student.name} hasn't saved any universities yet.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {savedUniversities.map(u => (
              <Link
                key={u.id}
                href={`/university/${u.slug}`}
                className="border rounded-lg p-3 hover:shadow-sm hover:border-blue-300 transition-all"
              >
                <div className="font-medium text-sm">{u.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {u.city}, {u.country}
                </div>
                {invitation.canSeeCosts && (
                  <div className="text-xs mt-2 text-blue-600 font-medium">
                    {formatUsd(u.tuitionUsd)}/yr
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Safety note (if permitted) */}
      {invitation.canSeeSafety && (
        <section className="border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="size-4 text-amber-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Safety & visa</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            For detailed visa requirements and safety information for each destination,
            visit the university's detail page.
          </p>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Visa requirements vary by nationality and destination. Always verify with the
              official embassy website. EduPath provides general guidance only — not legal advice.
            </p>
          </div>
        </section>
      )}

      {/* Footer note */}
      <div className="text-xs text-muted-foreground text-center pt-4">
        <p>
          This is a read-only view. You cannot edit {student.name}'s profile or applications.
        </p>
        <p className="mt-1">
          Questions? Contact them directly or email <a href="mailto:support@edupath.com" className="text-blue-600 hover:underline">support@edupath.com</a>.
        </p>
      </div>
    </div>
  )
}
