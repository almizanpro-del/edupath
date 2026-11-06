'use client'

/**
 * Account settings client component.
 *
 * Phase 1 scope:
 *   - Display profile (read-only; editing comes in Phase 2)
 *   - Delete account flow (2-step confirm: type "DELETE" to confirm)
 *
 * The delete flow calls DELETE /api/me which cascades:
 *   - reviews, savedLists, intakeSessions, agentMatches, leads (by email)
 *   - the Prisma User row
 *   - signs out the Supabase session
 *   - the Supabase auth user record is scheduled for cleanup (requires
 *     service-role key; if not configured, we note this in the response)
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronLeft, Trash2, Shield, Loader2, AlertTriangle, TrendingUp, ArrowRight, Check, Mail, Share2, Database } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { calculateProfileCompletion } from '@/lib/profile-completion'

type Profile = {
  name: string
  email: string
  country: string
  fieldOfInterest: string | null
  role: string
  verificationStatus: string
  createdAt: string
  educationLevel: string | null
  preferredCountries: string | null
  budgetUsd: number | null
  gpa: number | null
  englishLevel: string | null
  scholarshipNeed: boolean
  intake: string | null
  consentProcessing: boolean
  consentMarketing: boolean
  consentLeadSharing: boolean
}

type Stats = {
  reviews: number
  savedLists: number
  intakeSessions: number
  leads: number
}

export function AccountSettingsClient({
  profile,
  stats,
  dbAvailable,
}: {
  profile: Profile
  stats: Stats
  dbAvailable: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [confirmText, setConfirmText] = React.useState('')
  const [deleting, setDeleting] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return
    setDeleting(true)

    try {
      const res = await fetch('/api/me', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete account')
      }

      toast({
        title: 'Account deleted',
        description: 'Your data has been removed. Redirecting…',
      })

      // Give the toast a moment to show, then redirect.
      setTimeout(() => router.push('/'), 1500)
    } catch (err) {
      toast({
        title: 'Could not delete account',
        description: err instanceof Error ? err.message : 'Please try again or contact support.',
        variant: 'destructive',
      })
      setDeleting(false)
      setDialogOpen(false)
      setConfirmText('')
    }
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-4" /> Back to EduPath
        </Link>
        <h1 className="text-3xl font-bold">Account settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, preferences, and data.
        </p>
      </div>

      {/* Profile section */}
      <section className="border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Profile</h2>
          {!dbAvailable && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <AlertTriangle className="size-3 mr-1" /> DB unavailable — read-only
            </Badge>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <p className="font-medium">{profile.name}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="font-medium truncate">{profile.email}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Country</Label>
            <p className="font-medium">{profile.country}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Field of interest</Label>
            <p className="font-medium">{profile.fieldOfInterest || '—'}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Account type</Label>
            <p className="font-medium capitalize">{profile.role}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Member since</Label>
            <p className="font-medium">{memberSince}</p>
          </div>
        </div>
        {/* Profile editing will land in Phase 2 */}
      </section>

      {/* Profile completion (ONB-06) */}
      {dbAvailable && (
        <ProfileCompletionSection profile={profile} />
      )}

      {/* Privacy & consent (ONB-05) */}
      {dbAvailable && (
        <ConsentSection
          consentMarketing={profile.consentMarketing}
          consentLeadSharing={profile.consentLeadSharing}
        />
      )}

      {/* Your data section */}
      <section className="border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Your data on EduPath</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.reviews}</div>
            <div className="text-xs text-muted-foreground">Reviews</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.savedLists}</div>
            <div className="text-xs text-muted-foreground">Saved universities</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.intakeSessions}</div>
            <div className="text-xs text-muted-foreground">Rihla sessions</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.leads}</div>
            <div className="text-xs text-muted-foreground">Inquiries sent</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Under GDPR and Jordan's Personal Protection Privacy Law No. 24 of 2023, you have
          the right to access and export this data. A full data export feature is coming soon —
          for now, contact <a href="mailto:privacy@edupath.com" className="text-blue-600 hover:underline">privacy@edupath.com</a>.
        </p>
      </section>

      {/* Danger zone */}
      <section className="border border-rose-200 dark:border-rose-900 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-rose-600" />
          <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-400">Danger zone</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Delete your account</p>
            <p className="text-xs text-muted-foreground">
              Permanently remove your profile, reviews, saved lists, and Rihla sessions.
              This action cannot be undone.
            </p>
          </div>
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0">
                <Trash2 className="size-4 mr-1" /> Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      This will permanently delete your EduPath account and remove all of your
                      data from our systems, including:
                    </p>
                    <ul className="list-disc pl-5 text-xs space-y-1">
                      <li>{stats.reviews} review{stats.reviews !== 1 ? 's' : ''}</li>
                      <li>{stats.savedLists} saved universities</li>
                      <li>{stats.intakeSessions} Rihla AI session{stats.intakeSessions !== 1 ? 's' : ''}</li>
                      <li>{stats.leads} sent inquir{stats.leads !== 1 ? 'ies' : 'y'}</li>
                    </ul>
                    <p className="text-rose-600 font-medium">
                      This action is irreversible. To confirm, type "DELETE" below.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Type DELETE to confirm'
                  autoComplete="off"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE' || deleting}
                  className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="size-4 mr-1 animate-spin" /> Deleting…
                    </>
                  ) : (
                    'Delete my account'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  )
}

// ─── Profile Completion Section (ONB-06) ──────────────────────────────────

function ProfileCompletionSection({ profile }: { profile: Profile }) {
  const completion = calculateProfileCompletion({
    name: profile.name,
    country: profile.country,
    fieldOfInterest: profile.fieldOfInterest,
    educationLevel: profile.educationLevel,
    preferredCountries: profile.preferredCountries,
    budgetUsd: profile.budgetUsd,
    gpa: profile.gpa,
    englishLevel: profile.englishLevel,
    scholarshipNeed: profile.scholarshipNeed,
    intake: profile.intake,
  })

  const scoreColor =
    completion.score >= 80 ? 'text-emerald-600'
    : completion.score >= 50 ? 'text-blue-600'
    : completion.score >= 30 ? 'text-amber-600'
    : 'text-rose-600'

  const barColor =
    completion.score >= 80 ? 'bg-emerald-500'
    : completion.score >= 50 ? 'bg-blue-500'
    : completion.score >= 30 ? 'bg-amber-500'
    : 'bg-rose-500'

  return (
    <section className="border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Profile completion</h2>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className={`text-3xl font-bold ${scoreColor}`}>{completion.score}%</span>
          <span className="text-sm text-muted-foreground">
            {completion.completedFields} of {completion.totalFields} fields completed
          </span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${completion.score}%` }}
          />
        </div>
      </div>

      {completion.nextSteps.length > 0 ? (
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Complete these to improve your matches and get better recommendations:
          </p>
          <div className="space-y-2">
            {completion.nextSteps.map(step => (
              <Link
                key={step.field}
                href={step.action}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-xs font-bold text-blue-600">
                    +{step.points}
                  </div>
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <Check className="size-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Your profile is complete! You're getting the best possible recommendations.
          </span>
        </div>
      )}
    </section>
  )
}

// ─── Consent Management Section (ONB-05) ──────────────────────────────────

function ConsentSection({
  consentMarketing,
  consentLeadSharing,
}: {
  consentMarketing: boolean
  consentLeadSharing: boolean
}) {
  const { toast } = useToast()
  const [marketing, setMarketing] = React.useState(consentMarketing)
  const [leadSharing, setLeadSharing] = React.useState(consentLeadSharing)
  const [saving, setSaving] = React.useState<string | null>(null)

  const updateConsent = async (field: 'consentMarketing' | 'consentLeadSharing', value: boolean) => {
    setSaving(field)
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({
        title: value ? 'Consent given' : 'Consent withdrawn',
        description: field === 'consentMarketing'
          ? (value ? 'You\'ll receive product updates and tips.' : 'You won\'t receive marketing emails.')
          : (value ? 'Universities may contact you with relevant offers.' : 'Your profile won\'t be shared with universities.'),
      })
    } catch {
      toast({ title: 'Failed to update consent', variant: 'destructive' })
      // Revert local state
      if (field === 'consentMarketing') setMarketing(!value)
      if (field === 'consentLeadSharing') setLeadSharing(!value)
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Privacy & consent</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        You control how your data is used. These settings can be changed at any time.
        See our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
      </p>

      {/* 1. Processing (required) */}
      <div className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
        <Database className="size-5 text-slate-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Data processing</span>
            <Badge variant="outline" className="text-[9px] text-slate-500">Required</Badge>
            <Check className="size-3.5 text-emerald-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Required to operate your account. Without this, we cannot provide EduPath's services.
          </p>
        </div>
      </div>

      {/* 2. Marketing (optional) */}
      <div className="flex items-start gap-3 p-3 border rounded-lg">
        <Mail className="size-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Marketing emails</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Product updates, tips, and newsletters. We won't spam — max 2 emails/month.
              </p>
            </div>
            <Checkbox
              checked={marketing}
              onCheckedChange={(v) => {
                const val = v === true
                setMarketing(val)
                updateConsent('consentMarketing', val)
              }}
              disabled={saving === 'consentMarketing'}
            />
          </div>
        </div>
      </div>

      {/* 3. Lead sharing (optional) */}
      <div className="flex items-start gap-3 p-3 border rounded-lg">
        <Share2 className="size-5 text-purple-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Share profile with universities</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow universities to see your profile (GPA, field, budget) when you contact them.
                Helps them provide relevant information and offers.
              </p>
            </div>
            <Checkbox
              checked={leadSharing}
              onCheckedChange={(v) => {
                const val = v === true
                setLeadSharing(val)
                updateConsent('consentLeadSharing', val)
              }}
              disabled={saving === 'consentLeadSharing'}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
