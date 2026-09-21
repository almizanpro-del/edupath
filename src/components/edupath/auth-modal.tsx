'use client'

import * as React from 'react'
import { User, X, Mail, Lock, Loader2, LogOut, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/edupath'
import { cn } from '@/lib/utils'

export type UserProfile = {
  id: string
  name: string
  country: string
  fieldOfInterest: string | null
  verificationStatus: string
  role: string // 'student' | 'recruiter' | 'admin'
}

type Props = {
  open: boolean
  onClose: () => void
  onAuthed: (profile: UserProfile) => void
}

export function AuthModal({ open, onClose, onAuthed }: Props) {
  const { toast } = useToast()
  const supabase = createClient()
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [fullName, setFullName] = React.useState('')
  const [country, setCountry] = React.useState('Jordan')

  React.useEffect(() => {
    if (!open) {
      setEmail('')
      setPassword('')
      setFullName('')
      setCountry('Jordan')
      setLoading(false)
    }
  }, [open])

  if (!open) return null

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }
    toast({ title: 'Welcome back!', description: email })
    // Fetch profile
    await fetchProfile()
    setLoading(false)
    onClose()
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          country,
        },
      },
    })
    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }
    if (data.user && !data.session) {
      // Email confirmation required
      toast({
        title: 'Check your email',
        description: 'We sent a confirmation link. Click it to activate your account, then sign in.',
      })
      setMode('signin')
    } else if (data.session) {
      toast({ title: 'Account created!', description: `Welcome, ${fullName}!` })
      await fetchProfile()
      onClose()
    }
    setLoading(false)
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/me')
      if (!res.ok) return
      const data = await res.json()
      if (data.profile) onAuthed(data.profile)
    } catch (e) {
      console.error('Failed to fetch profile', e)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined,
      },
    })
    if (error) {
      toast({
        title: 'Google sign-in failed',
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
    }
    // On success, browser redirects to Google then back to /auth/callback,
    // which exchanges the code for a session and redirects to /.
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 text-white hover:bg-white/20"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-white/15 flex items-center justify-center">
              <UserCircle2 className="size-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome to EduPath</h2>
              <p className="text-sm text-white/85">Sign in to save universities and write reviews</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            {/* Google OAuth - shared between sign in and sign up */}
            <div className="mt-4 space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-3"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GoogleIcon className="size-5" />
                )}
                Continue with Google
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>

            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Fatima Al-Rashid"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="signup-country">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.name}>
                          {c.flag} {c.name}
                        </SelectItem>
                      ))}
                      {/* Add a few MENA origin countries not in destination list */}
                      <SelectItem value="Saudi Arabia">🇸🇦 Saudi Arabia</SelectItem>
                      <SelectItem value="Qatar">🇶🇦 Qatar</SelectItem>
                      <SelectItem value="Kuwait">🇰🇼 Kuwait</SelectItem>
                      <SelectItem value="Bahrain">🇧🇭 Bahrain</SelectItem>
                      <SelectItem value="Oman">🇴🇲 Oman</SelectItem>
                      <SelectItem value="Morocco">🇲🇦 Morocco</SelectItem>
                      <SelectItem value="Tunisia">🇹🇳 Tunisia</SelectItem>
                      <SelectItem value="Algeria">🇩🇿 Algeria</SelectItem>
                      <SelectItem value="Iraq">🇮🇶 Iraq</SelectItem>
                      <SelectItem value="Palestine">🇵🇸 Palestine</SelectItem>
                      <SelectItem value="Yemen">🇾🇪 Yemen</SelectItem>
                      <SelectItem value="Syria">🇸🇾 Syria</SelectItem>
                      <SelectItem value="Libya">🇱🇾 Libya</SelectItem>
                      <SelectItem value="Sudan">🇸🇩 Sudan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : 'Create Account'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  By signing up you agree to our terms. We never share your data.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// =================== User Menu Button ===================
export function UserMenuButton({
  profile,
  onSignInClick,
  onSignOut,
}: {
  profile: UserProfile | null
  onSignInClick: () => void
  onSignOut: () => void
}) {
  const [menuOpen, setMenuOpen] = React.useState(false)

  if (!profile) {
    return (
      <Button variant="outline" size="sm" onClick={onSignInClick} className="gap-2">
        <User className="size-4" />
        Sign In
      </Button>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMenuOpen(!menuOpen)}
        className="gap-2"
      >
        <div className="size-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline">{profile.name.split(' ')[0]}</span>
      </Button>
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b bg-slate-50">
              <div className="font-semibold text-sm truncate">{profile.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                {profile.country}
              </div>
              {profile.verificationStatus === 'verified' && (
                <div className="text-[10px] text-blue-700 mt-1 font-medium">
                  ✓ Verified Student
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setMenuOpen(false)
                onSignOut()
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-rose-600"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// =================== Google Icon ===================
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
