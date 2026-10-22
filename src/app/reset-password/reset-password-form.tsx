'use client'

/**
 * Reset-password form. The user lands here from the email link.
 * Supabase puts a recovery code in the URL fragment (#access_token=...).
 * We exchange that for a session (automatically, on first client load),
 * then call updateUser({ password }) to set the new password.
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Loader2, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ResetPasswordForm() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ready, setReady] = React.useState(false)

  // On mount, exchange the recovery code in the URL hash for a session.
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true)
      } else {
        // No session — likely the link was clicked twice or expired.
        setError('This password reset link is invalid or has expired. Please request a new one.')
      }
    })
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setDone(true)
    toast({
      title: 'Password updated',
      description: 'You can now sign in with your new password.',
    })

    // Sign out the recovery session and redirect home after 3s.
    setTimeout(async () => {
      await supabase.auth.signOut()
      router.push('/')
    }, 3000)
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="size-16 rounded-full bg-green-50 dark:bg-green-950 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Password updated</h1>
        <p className="text-sm text-muted-foreground">
          Your password has been changed. Redirecting you to sign in…
        </p>
      </div>
    )
  }

  if (error && !ready) {
    return (
      <div className="text-center space-y-4">
        <div className="size-16 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center mx-auto">
          <AlertCircle className="size-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold">Link expired</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link
          href="/forgot-password"
          className="inline-block text-blue-600 hover:underline text-sm"
        >
          Request a new reset link
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Back to EduPath
        </Link>
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password you haven't used before.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
              minLength={6}
              required
              autoFocus
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="confirm"
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-9"
              minLength={6}
              required
            />
          </div>
        </div>
        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950 p-3 rounded-lg">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading || !ready}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : 'Update password'}
        </Button>
      </form>
    </div>
  )
}
