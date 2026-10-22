/**
 * /forgot-password
 *
 * Step 1 of password reset: user enters their email, we call Supabase's
 * resetPasswordForEmail() which sends them an email with a link to
 * /reset-password?code=... Supabase handles the email delivery.
 *
 * After submit, we always show "if that email exists, you'll get a link"
 * — never reveal whether the email is registered (anti-enumeration).
 */
import { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your EduPath password.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <ForgotPasswordForm />
    </div>
  )
}
