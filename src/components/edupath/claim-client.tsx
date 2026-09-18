'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Mail, User, FileText, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { countryFlagUrl } from '@/lib/edupath'

type Props = { university: { id: string; name: string; slug: string; country: string; city: string } }

export function ClaimClient({ university }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [officialName, setOfficialName] = React.useState('')
  const [officialEmail, setOfficialEmail] = React.useState('')
  const [officialTitle, setOfficialTitle] = React.useState('')
  const [proofUrl, setProofUrl] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch('/api/me').then(r => r.json()).then(d => { if (d.profile) { setProfile(d.profile); setOfficialName(d.profile.name); setOfficialEmail(d.profile.country) } })
      } else { setAuthModalOpen(true) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setProfile(null); setAuthModalOpen(true) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!officialName || !officialEmail) { toast({ title: 'Name and email are required', variant: 'destructive' }); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universityId: university.id, officialName, officialEmail, officialTitle, proofUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubmitted(true)
      toast({ title: 'Claim submitted!', description: 'We will review it within 3 business days.' })
    } catch (err) {
      toast({ title: 'Failed to submit', description: err instanceof Error ? err.message : 'Try again', variant: 'destructive' })
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/university/${university.slug}`)} className="gap-2"><ArrowLeft className="size-4" /> Back</Button>
          <div className="flex items-center gap-2"><Building2 className="size-5 text-emerald-600" /><span className="font-bold">Claim University Profile</span></div>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* University header */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-lg border">
          <Image src={countryFlagUrl(university.country, 40)} alt="" width={28} height={20} className="rounded" unoptimized />
          <div>
            <h1 className="font-bold text-lg">{university.name}</h1>
            <p className="text-sm text-muted-foreground">{university.city}, {university.country}</p>
          </div>
        </div>

        {submitted ? (
          <Card><CardContent className="pt-6 text-center py-12">
            <CheckCircle2 className="size-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Claim Submitted!</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              We will verify your affiliation with {university.name} and respond within 3 business days.
              Once approved, you'll get access to the sponsor dashboard with analytics and lead management.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => router.push(`/university/${university.slug}`)}>Back to University</Button>
              <Button onClick={() => router.push('/')}>Go Home</Button>
            </div>
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h2 className="font-bold text-lg mb-2">Claim this university profile</h2>
                <p className="text-sm text-muted-foreground">
                  If you're an official representative of {university.name}, claim this profile to:
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Access the sponsor dashboard with analytics</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Receive student leads directly via email</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Update program information and deadlines</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Respond to student reviews</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Get featured placement in the directory</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="officialName" className="text-xs flex items-center gap-1"><User className="size-3" /> Your Full Name *</Label>
                  <Input id="officialName" value={officialName} onChange={e => setOfficialName(e.target.value)} required placeholder="Dr. Ahmed Hassan" />
                </div>
                <div>
                  <Label htmlFor="officialEmail" className="text-xs flex items-center gap-1"><Mail className="size-3" /> Official University Email *</Label>
                  <Input id="officialEmail" type="email" value={officialEmail} onChange={e => setOfficialEmail(e.target.value)} required placeholder="admissions@university.edu" />
                  <p className="text-[10px] text-muted-foreground mt-1">Must be an official university email domain (e.g., @university.edu)</p>
                </div>
                <div>
                  <Label htmlFor="officialTitle" className="text-xs">Your Title / Role</Label>
                  <Input id="officialTitle" value={officialTitle} onChange={e => setOfficialTitle(e.target.value)} placeholder="Director of International Admissions" />
                </div>
                <div>
                  <Label htmlFor="proofUrl" className="text-xs flex items-center gap-1"><FileText className="size-3" /> Proof URL (optional)</Label>
                  <Input id="proofUrl" type="url" value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="https://university.edu/staff/your-profile" />
                  <p className="text-[10px] text-muted-foreground mt-1">Link to your staff page on the university website for faster verification</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <strong>Verification process:</strong> We verify claims by checking the email domain matches the university's official domain,
                  and may contact the university directly. Claims are typically processed within 3 business days.
                </div>

                <Button type="submit" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Building2 className="size-4" />}
                  Submit Claim
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => { setProfile(p); setOfficialName(p.name) }} />
    </div>
  )
}
