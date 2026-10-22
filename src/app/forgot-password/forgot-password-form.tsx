'use client'

/**
 * Forgot-password form. Calls Supabase auth.resetPasswordForEmail()
 * with a redirect back to /reset-password, where Supabase will land
 * the user with a recovery code in the URL.
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ForgotPasswordForm() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    setLoading(false)

    if (error) {
      // Don't leak whether the email exists — show the same success message.
      // But still toast a generic "if valid, you'll get an email" so the user
      // knows the form submitted.
      console.warn('[forgot-password] Supabase error:', error.message)
    }

    setSent(true)
    toast({
      title: 'Check your email',
      description: 'If an account exists for that email, a reset link is on its way.',
    })
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="size-16 rounded-full bg-green-50 dark:bg-green-950 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          If an account exists for <strong>{email}</strong>, you'll receive an email
          with a password reset link. The link expires in 1 hour.
        </p>
        <p className="text-xs text-muted-foreground">
          Didn't get the email? Check your spam folder, or{' '}
          <button
            onClick={() => setSent(false)}
            className="text-blue-600 hover:underline"
          >
            try a different email
          </button>
          .
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Back to EduPath
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
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a link to set a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              required
              autoFocus
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : 'Send reset link'}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        Remembered your password?{' '}
        <Link href="/" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
