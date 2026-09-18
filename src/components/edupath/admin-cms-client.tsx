'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Search, Check, X, Edit, Trash2, Plus, Loader2, FileText, AlertCircle, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { AuthModal, type UserProfile } from '@/components/edupath/auth-modal'
import { createClient } from '@/lib/supabase/client'
import { formatUsd, countryFlagUrl } from '@/lib/edupath'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

type Uni = {
  id: string; slug: string; name: string; country: string; city: string
  website: string; tuitionUsd: number; livingCostUsd: number; intlStudentPct: number
  acceptanceRate: number | null; currency: string; logoUrl: string | null
  descriptionEn: string | null; descriptionAr: string | null; pendingReview: boolean
  _count?: { programs: number; scholarships: number; reviews: number }
}

export function AdminCMSClient() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('AdminCMS')
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [universities, setUniversities] = React.useState<Uni[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'published'>('pending')
  const [editing, setEditing] = React.useState<Uni | null>(null)
  const [creating, setCreating] = React.useState(false)

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetch('/api/me').then(r => r.json()).then(data => {
          if (data.profile) setProfile(data.profile)
          else setAuthModalOpen(true)
        })
      } else {
        setAuthModalOpen(true)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setProfile(null); setAuthModalOpen(true) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadUniversities = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'pending') params.set('pending', 'true')
      if (searchQuery) params.set('q', searchQuery)
      const res = await fetch(`/api/admin/universities?${params}`)
      const data = await res.json()
      setUniversities(data.universities || [])
    } catch {
      toast({ title: 'Failed to load', variant: 'destructive' })
    }
    setLoading(false)
  }, [filter, searchQuery, toast])

  React.useEffect(() => {
    if (profile?.role === 'admin') loadUniversities()
  }, [profile, loadUniversities])

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/universities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'University approved', description: 'Now visible in the directory' })
      loadUniversities()
    } catch {
      toast({ title: 'Failed to approve', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/universities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'University deleted' })
      loadUniversities()
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' })
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="size-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('adminAccessRequired')}</h2>
            <p className="text-sm text-muted-foreground mb-4">Sign in with an admin account to access the CMS.</p>
            <Button onClick={() => setAuthModalOpen(true)}>{t('signIn')}</Button>
          </CardContent>
        </Card>
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
      </div>
    )
  }

  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="size-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('notAdmin')}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your account doesn't have admin access. Run this command to promote yourself:
            </p>
            <code className="block bg-slate-900 text-slate-100 rounded p-2 text-xs text-left">
              bun run scripts/promote-admin.ts {profile.name}@example.com
            </code>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-slate-700" />
              <span className="font-bold"> Admin CMS </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/analytics')} className="gap-2">
              <BarChart3 className="size-4" /> Analytics
            </Button>
            <Button onClick={() => setCreating(true)} size="sm" className="gap-2">
              <Plus className="size-4" /> Add University
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && loadUniversities()}
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="pending">{t('pendingReview')}</TabsTrigger>
              <TabsTrigger value="published">{t('published')}</TabsTrigger>
              <TabsTrigger value="all">{t('all')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={loadUniversities}>{t('refresh')}</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{universities.filter(u => u.pendingReview).length}</div>
            <div className="text-xs text-muted-foreground">{t('pendingReview')}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{universities.filter(u => !u.pendingReview).length}</div>
            <div className="text-xs text-muted-foreground">{t('published')}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{universities.length}</div>
            <div className="text-xs text-muted-foreground">{t('totalFiltered')}</div>
          </CardContent></Card>
        </div>

        {/* University list */}
        {loading ? (
          <div className="text-center py-20"><Loader2 className="size-8 animate-spin mx-auto text-slate-400" /></div>
        ) : universities.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <FileText className="size-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">{t('noResults')}</h3>
            <p className="text-sm text-muted-foreground">{t('noResultsDesc')}</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {universities.map(u => (
              <Card key={u.id} className={cn(u.pendingReview && 'border-amber-300 bg-amber-50/30')}>
                <CardContent className="py-3 flex items-center gap-4">
                  <Image src={countryFlagUrl(u.country, 40)} alt="" width={28} height={20} className="rounded shrink-0" unoptimized />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{u.name}</span>
                      {u.pendingReview && <Badge variant="outline" className="text-amber-700 border-amber-400 text-[10px]">{t('pending')}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{u.city}, {u.country}</span>
                      <span>{formatUsd(u.tuitionUsd)}/yr</span>
                      {_count_programs(u)} programs · {_count_scholarships(u)} scholarships
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {u.pendingReview && (
                      <Button size="sm" variant="ghost" onClick={() => handleApprove(u.id)} className="text-emerald-600 hover:text-emerald-700 gap-1">
                        <Check className="size-4" /> {t('approve')}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditing(u)} className="gap-1">
                      <Edit className="size-4" /> {t('edit')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id, u.name)} className="text-rose-600 hover:text-rose-700 gap-1">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <EditUniversityModal
          university={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadUniversities() }}
        />
      )}

      {/* Create modal */}
      {creating && (
        <CreateUniversityModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); loadUniversities() }}
        />
      )}

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthed={(p) => setProfile(p)} />
    </div>
  )
}

function _count_programs(u: Uni) { return u._count?.programs ?? 0 }
function _count_scholarships(u: Uni) { return u._count?.scholarships ?? 0 }

// =================== Edit Modal ===================
function EditUniversityModal({ university, onClose, onSaved }: { university: Uni; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = React.useState(university)
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/universities/${university.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, country: form.country, city: form.city, website: form.website,
          tuitionUsd: Number(form.tuitionUsd), livingCostUsd: Number(form.livingCostUsd),
          intlStudentPct: Number(form.intlStudentPct), acceptanceRate: form.acceptanceRate ? Number(form.acceptanceRate) : null,
          descriptionEn: form.descriptionEn, descriptionAr: form.descriptionAr,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'University updated' })
      onSaved()
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
          <h2 className="font-bold">Edit: {university.name}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white"><X className="size-5" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label className="text-xs">Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label className="text-xs">Website</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Tuition (USD/yr)</Label><Input type="number" value={form.tuitionUsd} onChange={e => setForm({ ...form, tuitionUsd: e.target.value as unknown as number })} /></div>
              <div><Label className="text-xs">Living Cost (USD/yr)</Label><Input type="number" value={form.livingCostUsd} onChange={e => setForm({ ...form, livingCostUsd: e.target.value as unknown as number })} /></div>
              <div><Label className="text-xs">Intl Student %</Label><Input type="number" value={form.intlStudentPct} onChange={e => setForm({ ...form, intlStudentPct: e.target.value as unknown as number })} /></div>
            </div>
            <div><Label className="text-xs">Acceptance Rate %</Label><Input type="number" value={form.acceptanceRate ?? ''} onChange={e => setForm({ ...form, acceptanceRate: e.target.value as unknown as number })} /></div>
            <div><Label className="text-xs">Description (English)</Label><Textarea rows={3} value={form.descriptionEn ?? ''} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} /></div>
            <div><Label className="text-xs">Description (Arabic)</Label><Textarea rows={3} value={form.descriptionAr ?? ''} onChange={e => setForm({ ...form, descriptionAr: e.target.value })} dir="rtl" /></div>
          </div>
        </ScrollArea>
        <div className="border-t p-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

// =================== Create Modal ===================
function CreateUniversityModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = React.useState({ name: '', country: '', city: '', website: '', tuitionUsd: 5000, livingCostUsd: 6000, intlStudentPct: 15, descriptionEn: '', descriptionAr: '' })
  const [saving, setSaving] = React.useState(false)

  const handleCreate = async () => {
    if (!form.name || !form.country) { toast({ title: 'Name and country are required', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'University created' })
      onCreated()
    } catch { toast({ title: 'Failed to create', variant: 'destructive' }) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
          <h2 className="font-bold">Add New University</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white"><X className="size-5" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label className="text-xs">Country *</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label className="text-xs">Website</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Tuition (USD/yr)</Label><Input type="number" value={form.tuitionUsd} onChange={e => setForm({ ...form, tuitionUsd: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Living Cost (USD/yr)</Label><Input type="number" value={form.livingCostUsd} onChange={e => setForm({ ...form, livingCostUsd: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Intl Student %</Label><Input type="number" value={form.intlStudentPct} onChange={e => setForm({ ...form, intlStudentPct: Number(e.target.value) })} /></div>
            </div>
            <div><Label className="text-xs">Description (English)</Label><Textarea rows={3} value={form.descriptionEn} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} /></div>
          </div>
        </ScrollArea>
        <div className="border-t p-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 gap-2" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create University
          </Button>
        </div>
      </div>
    </div>
  )
}
