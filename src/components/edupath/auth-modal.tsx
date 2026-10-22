'use client'

import * as React from 'react'
import Link from 'next/link'
import { User, X, Mail, Lock, Loader2, LogOut, UserCircle2, Settings, Sparkles, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/edupath'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('Auth')
  const supabase = createClient()
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [fullName, setFullName] = React.useState('')
  const [country, setCountry] = React.useState('Jordan')
  const [agreedToTerms, setAgreedToTerms] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setEmail('')
      setPassword('')
      setFullName('')
      setCountry('Jordan')
      setAgreedToTerms(false)
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
        title: t('signInFailed'),
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }
    toast({ title: t('welcomeBack'), description: email })
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
        title: t('signUpFailed'),
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }
    if (data.user && !data.session) {
      // Email confirmation required — Supabase will send the verification email.
      // We also try to fire a welcome email via our /api/email/welcome endpoint
      // (best-effort; non-blocking).
      try {
        await fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, name: fullName }),
        })
      } catch {
        // Non-critical — the welcome email is a nicety, not a requirement.
      }
      toast({
        title: t('checkEmail'),
        description: t('checkEmailDesc'),
      })
      setMode('signin')
    } else if (data.session) {
      // Logged in immediately (email confirmation disabled in Supabase).
      // Fire welcome email best-effort.
      try {
        await fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, name: fullName }),
        })
      } catch {
        // Non-critical.
      }
      toast({ title: t('accountCreated'), description: `${t('welcomeBack')}, ${fullName}!` })
      await fetchProfile()
      onClose()
      // Redirect new users to onboarding so we can personalize their directory.
      if (typeof window !== 'undefined') {
        window.location.href = '/onboarding'
      }
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
        title: t('googleFailed'),
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
              <h2 className="text-xl font-bold">{t('welcome')}</h2>
              <p className="text-sm text-white/85">{t('welcomeDesc')}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('signIn')}</TabsTrigger>
              <TabsTrigger value="signup">{t('createAccount')}</TabsTrigger>
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
                {t('continueWithGoogle')}
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{t('or')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>

            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('email')}</Label>
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
                  <Label htmlFor="signin-password">{t('password')}</Label>
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
                  {loading ? <Loader2 className="size-4 animate-spin" /> : t('signInBtn')}
                </Button>
                <div className="text-xs text-center">
                  <Link href="/forgot-password" className="text-blue-600 hover:underline">
                    {t('forgotPassword')}
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('fullName')}</Label>
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
                  <Label htmlFor="signup-email">{t('email')}</Label>
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
                  <Label htmlFor="signup-password">{t('password')}</Label>
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
                  <Label htmlFor="signup-country">{t('country')}</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="signup-country">
                      <SelectValue placeholder={t('selectCountry')} />
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
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agree-terms"
                    checked={agreedToTerms}
                    onCheckedChange={(v) => setAgreedToTerms(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="agree-terms" className="text-xs text-muted-foreground leading-relaxed font-normal">
                    {t('agreePrefix')}{' '}
                    <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                      {t('termsLink')}
                    </Link>{' '}
                    {t('andPrefix')}{' '}
                    <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                      {t('privacyLink')}
                    </Link>
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : t('createAccountBtn')}
                </Button>
                {!agreedToTerms && (
                  <p className="text-xs text-muted-foreground text-center">
                    {t('mustAgree')}
                  </p>
                )}
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
  const t = useTranslations('Auth')
  const tNav = useTranslations('Nav')
  const [menuOpen, setMenuOpen] = React.useState(false)

  if (!profile) {
    return (
      <Button variant="outline" size="sm" onClick={onSignInClick} className="gap-2">
        <User className="size-4" />
        {tNav('signIn')}
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
                  ✓ {t('welcomeBack')}
                </div>
              )}
            </div>
            <a
              href="/my-applications"
              onClick={() => setMenuOpen(false)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
            >
              <Calendar className="size-4" />
              {tNav('myApplications')}
            </a>
            <a
              href="/my-matches"
              onClick={() => setMenuOpen(false)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
            >
              <Sparkles className="size-4" />
              {tNav('myMatches')}
            </a>
            <a
              href="/my-essays"
              onClick={() => setMenuOpen(false)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
            >
              <FileText className="size-4" />
              {tNav('myEssays')}
            </a>
            <a
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
            >
              <Settings className="size-4" />
              {tNav('accountSettings')}
            </a>
            <button
              onClick={() => {
                setMenuOpen(false)
                onSignOut()
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-rose-600"
            >
              <LogOut className="size-4" />
              {tNav('signOut')}
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
