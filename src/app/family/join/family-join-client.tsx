'use client'

/**
 * Family join client — handles the accept-invitation flow.
 *
 * States:
 *   - not authenticated → show "Sign up / Sign in" CTA
 *   - authenticated, pending → show "Accept invitation" button
 *   - accepting → loading spinner
 *   - accepted → redirect to /family/view/[id]
 *   - error → show error message
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, Check, Loader2, AlertCircle, Wallet, Calendar,
  Shield, GraduationCap, FileText, ChevronLeft,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

type Invitation = {
  id: string
  status: string
  parentName: string | null
  canSeeCosts: boolean
  canSeeDeadlines: boolean
  canSeeSafety: boolean
  canSeeAcademic: boolean
  canSeeDocuments: boolean
  student: { name: string }
}

export function FamilyJoinClient({
  invitation,
  token,
}: {
  invitation: Invitation
  token: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [authChecked, setAuthChecked] = React.useState(false)
  const [authenticated, setAuthenticated] = React.useState(false)
  const [accepting, setAccepting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Check auth state on mount
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session)
      setAuthChecked(true)
    })
  }, [])

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)
    try {
      const res = await fetch('/api/family/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation')

      toast({
        title: 'Invitation accepted!',
        description: `You're now following ${invitation.student.name}'s university journey.`,
      })

      // Redirect to the parent dashboard view
      router.push(`/family/view/${invitation.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
      setAccepting(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <Loader2 className="size-8 animate-spin text-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto max-w-lg px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="size-4" /> Back to EduPath
        </Link>

        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-sm p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex size-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 items-center justify-center mb-4">
              <Users className="size-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1">You're invited!</h1>
            <p className="text-sm text-muted-foreground">
              {invitation.parentName ? `${invitation.parentName}, ` : ''}
              {invitation.student.name} has invited you to follow their university journey.
            </p>
          </div>

          {/* What you'll see */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              What you'll be able to see
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <PermissionRow
                icon={<Wallet className="size-4" />}
                label="Total costs (tuition, living, visa, insurance)"
                enabled={invitation.canSeeCosts}
              />
              <PermissionRow
                icon={<Calendar className="size-4" />}
                label="Application deadlines"
                enabled={invitation.canSeeDeadlines}
              />
              <PermissionRow
                icon={<Shield className="size-4" />}
                label="Safety and visa information"
                enabled={invitation.canSeeSafety}
              />
              <PermissionRow
                icon={<GraduationCap className="size-4" />}
                label="Academic details (GPA, programs)"
                enabled={invitation.canSeeAcademic}
              />
              <PermissionRow
                icon={<FileText className="size-4" />}
                label="Uploaded documents"
                enabled={invitation.canSeeDocuments}
              />
            </div>
          </div>

          {/* Privacy note */}
          <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
            You'll have a read-only view focused on what parents care about most.
            You cannot edit the student's profile or submit applications on their behalf.
            The student can revoke your access at any time.
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg">
              <AlertCircle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}

          {/* Action area */}
          {!authenticated ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Create a free EduPath account (or sign in) to accept this invitation.
              </p>
              <Button className="w-full" size="lg" asChild>
                <Link href="/">Sign up to continue</Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{' '}
                <Link href="/" className="text-blue-600 hover:underline">Sign in</Link>
              </p>
            </div>
          ) : invitation.status === 'accepted' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <Check className="size-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  You've already accepted this invitation
                </span>
              </div>
              <Button className="w-full" size="lg" onClick={() => router.push(`/family/view/${invitation.id}`)}>
                Go to dashboard
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <><Loader2 className="size-4 animate-spin" /> Accepting…</>
              ) : (
                <>Accept invitation</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function PermissionRow({
  icon,
  label,
  enabled,
}: {
  icon: React.ReactNode
  label: string
  enabled: boolean
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${enabled ? '' : 'opacity-40'}`}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {enabled ? (
        <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">
          <Check className="size-2.5 mr-0.5" /> Visible
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[9px] text-slate-400">Hidden</Badge>
      )}
    </div>
  )
}
