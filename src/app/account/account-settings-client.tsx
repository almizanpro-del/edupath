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
import { ChevronLeft, Trash2, Shield, Loader2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Profile = {
  name: string
  email: string
  country: string
  fieldOfInterest: string | null
  role: string
  verificationStatus: string
  createdAt: string
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
