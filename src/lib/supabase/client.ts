'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client.
 * Uses the anon key (publishable) — safe to expose to the browser.
 * RLS policies on the Supabase side protect data.
 *
 * If env vars are missing (e.g., not configured on Vercel), returns a no-op
 * mock client so the page still renders. Auth features will be disabled but
 * the directory, comparison, and cost calculator all work without auth.
 */

// Cache the client so we don't create a new one on every call
let cachedClient: ReturnType<typeof createBrowserClient> | null = null
let envVarsChecked = false
let envVarsAvailable = false

function checkEnvVars() {
  if (envVarsChecked) return envVarsAvailable
  envVarsChecked = true
  envVarsAvailable = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  return envVarsAvailable
}

// Minimal no-op mock that satisfies the SupabaseClient interface
// for the methods we use (auth.getSession, auth.getUser, auth.onAuthStateChange,
// auth.signInWithPassword, auth.signUp, auth.signInWithOAuth, auth.signOut)
function createMockClient() {
  const noop = () => Promise.resolve({ data: {}, error: null })
  const mockAuth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Auth not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.' } }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Auth not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.' } }),
    signInWithOAuth: () => Promise.resolve({ data: { url: null }, error: { message: 'Auth not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.' } }),
    signOut: () => Promise.resolve({ error: null }),
  }
  return { auth: mockAuth } as unknown as ReturnType<typeof createBrowserClient>
}

export function createClient() {
  if (cachedClient) return cachedClient

  if (!checkEnvVars()) {
    console.warn('[supabase/client] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set. Auth features will be disabled.')
    cachedClient = createMockClient()
    return cachedClient
  }

  try {
    cachedClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    return cachedClient
  } catch (error) {
    console.warn('[supabase/client] Failed to create Supabase client:', error)
    cachedClient = createMockClient()
    return cachedClient
  }
}
