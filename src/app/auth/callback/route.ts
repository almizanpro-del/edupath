/**
 * OAuth callback handler.
 * After Google OAuth redirects back to /auth/callback?code=...,
 * exchange the code for a session and redirect to /.
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('OAuth code exchange failed:', error.message)
      // Redirect home anyway — the user will just not be signed in
    }
  }

  return NextResponse.redirect(`${url.origin}${next}`)
}
