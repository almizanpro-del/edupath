import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase auth session on every request.
 * Wrapped in try-catch so auth failures NEVER block page rendering.
 * Auth state is also read client-side in EduPathApp, so the middleware
 * is a best-effort cookie refresh, not a gate.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // Check if env vars are available (they should be, but edge runtime can be finicky)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      // No env vars — skip auth refresh, let the page render
      return supabaseResponse
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    // Refresh the session (network call — may fail in edge runtime)
    // Use getTime-jittered retry? No — just let it fail gracefully.
    await supabase.auth.getUser()
  } catch (error) {
    // Auth refresh failed (network, timeout, bad env, etc.)
    // Don't block the page — auth state is also read client-side.
    console.warn('[middleware] Supabase auth refresh failed, continuing without session refresh:', error)
  }

  return supabaseResponse
}
