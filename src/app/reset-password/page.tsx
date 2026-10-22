/**
 * /reset-password
 *
 * Step 2 of password reset: Supabase lands the user here with a recovery
 * token in the URL hash. The form below calls updateUser({ password })
 * which sets the new password (Supabase verifies the recovery token
 * automatically via the URL).
 *
 * After success, we redirect to home and let the existing auth flow
 * take over.
 */
import { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Set New Password',
  description: 'Set a new password for your EduPath account.',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <ResetPasswordForm />
    </div>
  )
}
