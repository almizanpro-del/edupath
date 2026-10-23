'use client'

/**
 * Family Decision Room client.
 *
 * Student view: invite parents, manage permissions, see pending/accepted invitations.
 * Parent view: list of children they're following (with a link to view the child's dashboard).
 */
import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronLeft, UserPlus, Users, Clock, Check, X, Loader2,
  Wallet, Calendar, Shield, GraduationCap, FileText, Copy,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type SentInvitation = {
  id: string; parentEmail: string; parentName: string | null
  status: string; inviteToken: string; createdAt: string; acceptedAt: string | null
  canSeeCosts: boolean; canSeeDeadlines: boolean; canSeeSafety: boolean
  canSeeAcademic: boolean; canSeeDocuments: boolean
}

type ReceivedInvitation = {
  id: string
  student: { id: string; name: string; country: string; fieldOfInterest: string | null }
  permissions: {
    canSeeCosts: boolean; canSeeDeadlines: boolean; canSeeSafety: boolean
    canSeeAcademic: boolean; canSeeDocuments: boolean
  }
}

export function FamilyClient({
  sent: initialSent,
  received,
}: {
  sent: SentInvitation[]
  received: ReceivedInvitation[]
}) {
  const { toast } = useToast()
  const [sent, setSent] = React.useState(initialSent)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteName, setInviteName] = React.useState('')
  const [sending, setSending] = React.useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ parentEmail: inviteEmail, parentName: inviteName || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      setSent(prev => [{
        id: data.id,
        parentEmail: inviteEmail,
        parentName: inviteName || null,
        status: 'pending',
        inviteToken: data.inviteToken,
        createdAt: new Date().toISOString(),
        acceptedAt: null,
        canSeeCosts: true, canSeeDeadlines: true, canSeeSafety: true,
        canSeeAcademic: false, canSeeDocuments: false,
      }, ...prev])

      toast({
        title: 'Invitation sent!',
        description: `We emailed ${inviteEmail} with a link to join your Family Room.`,
      })
      setInviteEmail('')
      setInviteName('')
    } catch (err) {
      toast({
        title: 'Failed to send invitation',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handlePermissionChange = async (id: string, field: string, value: boolean) => {
    // Optimistic update
    setSent(prev => prev.map(inv =>
      inv.id === id ? { ...inv, [field]: value } : inv
    ))
    try {
      await fetch('/api/family', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, [field]: value }),
      })
    } catch {
      toast({ title: 'Failed to update permissions', variant: 'destructive' })
      // Revert
      setSent(prev => prev.map(inv =>
        inv.id === id ? { ...inv, [field]: !value } : inv
      ))
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this invitation? The parent will lose access.')) return
    try {
      await fetch('/api/family', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, revoke: true }),
      })
      setSent(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status: 'revoked' } : inv
      ))
      toast({ title: 'Invitation revoked' })
    } catch {
      toast({ title: 'Failed to revoke', variant: 'destructive' })
    }
  }

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/family/join?token=${token}`
    navigator.clipboard.writeText(url)
    toast({ title: 'Link copied!', description: 'Share it with your parent directly.' })
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="size-4" /> Back to EduPath
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="size-7 text-blue-600" />
          Family Decision Room
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invite your parents to follow your university journey. They'll see costs, deadlines, and safety info — you control what they can view.
        </p>
      </div>

      {/* If the user is a parent (has received invitations), show their children */}
      {received.length > 0 && (
        <section className="border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Students you're following</h2>
          <div className="space-y-3">
            {received.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{inv.student.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.student.country}{inv.student.fieldOfInterest ? ` · ${inv.student.fieldOfInterest}` : ''}
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/family/view/${inv.id}`}>View dashboard</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invite form */}
      <section className="border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Invite a parent or guardian</h2>
        </div>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="parent-name">Parent's name (optional)</Label>
              <Input
                id="parent-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. My father"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-email">Parent's email *</Label>
              <Input
                id="parent-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="parent@example.com"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={sending || !inviteEmail.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Send invitation
          </Button>
        </form>
      </section>

      {/* Sent invitations */}
      {sent.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your invitations</h2>
          <div className="space-y-3">
            {sent.map(inv => (
              <div key={inv.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{inv.parentName || inv.parentEmail}</span>
                      {inv.status === 'pending' && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          <Clock className="size-3 mr-1" /> Pending
                        </Badge>
                      )}
                      {inv.status === 'accepted' && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                          <Check className="size-3 mr-1" /> Accepted
                        </Badge>
                      )}
                      {inv.status === 'revoked' && (
                        <Badge variant="secondary">Revoked</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{inv.parentEmail}</div>
                  </div>
                  {inv.status !== 'revoked' && (
                    <div className="flex items-center gap-2">
                      {inv.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyInviteLink(inv.inviteToken)}
                        >
                          <Copy className="size-3.5 mr-1" /> Copy link
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={() => handleRevoke(inv.id)}
                      >
                        <X className="size-3.5" /> Revoke
                      </Button>
                    </div>
                  )}
                </div>

                {/* Permission controls */}
                {inv.status !== 'revoked' && (
                  <div className="pt-3 border-t">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      What they can see
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <PermissionToggle
                        icon={<Wallet className="size-3.5" />}
                        label="Costs & budget"
                        checked={inv.canSeeCosts}
                        onChange={(v) => handlePermissionChange(inv.id, 'canSeeCosts', v)}
                      />
                      <PermissionToggle
                        icon={<Calendar className="size-3.5" />}
                        label="Deadlines"
                        checked={inv.canSeeDeadlines}
                        onChange={(v) => handlePermissionChange(inv.id, 'canSeeDeadlines', v)}
                      />
                      <PermissionToggle
                        icon={<Shield className="size-3.5" />}
                        label="Safety info"
                        checked={inv.canSeeSafety}
                        onChange={(v) => handlePermissionChange(inv.id, 'canSeeSafety', v)}
                      />
                      <PermissionToggle
                        icon={<GraduationCap className="size-3.5" />}
                        label="Academic details"
                        checked={inv.canSeeAcademic}
                        onChange={(v) => handlePermissionChange(inv.id, 'canSeeAcademic', v)}
                      />
                      <PermissionToggle
                        icon={<FileText className="size-3.5" />}
                        label="Documents"
                        checked={inv.canSeeDocuments}
                        onChange={(v) => handlePermissionChange(inv.id, 'canSeeDocuments', v)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Privacy note */}
      <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 border rounded-lg p-4">
        <strong>Privacy:</strong> Parents only see what you explicitly allow. They cannot edit your profile,
        submit applications, or contact universities on your behalf. You can revoke access at any time.
      </div>
    </div>
  )
}

function PermissionToggle({
  icon, label, checked, onChange,
}: {
  icon: React.ReactNode
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <span className="text-xs flex items-center gap-1.5">
        {icon} {label}
      </span>
    </label>
  )
}
