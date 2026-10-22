'use client'

/**
 * Kanban-style application tracker.
 * Columns: researching → applying → submitted → interviewing → decision → enrolled
 * Each card is draggable between columns (uses simple button-based moving
 * for reliability without a DnD library).
 */
import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft, Plus, Loader2, MapPin, Clock, Calendar,
  ChevronRight, X, StickyNote, ExternalLink, Trash2,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

type Application = {
  id: string
  status: string
  decision: string | null
  programId: string | null
  appliedAt: string | null
  deadlineAt: string | null
  decisionAt: string | null
  notes: string
  createdAt: string
  updatedAt: string
  university: { id: string; name: string; slug: string; country: string; city: string }
}

const COLUMNS = [
  { id: 'researching', label: 'Researching', color: 'border-slate-300' },
  { id: 'applying', label: 'Applying', color: 'border-blue-300' },
  { id: 'submitted', label: 'Submitted', color: 'border-amber-300' },
  { id: 'interviewing', label: 'Interviewing', color: 'border-purple-300' },
  { id: 'decision', label: 'Decision', color: 'border-orange-300' },
  { id: 'enrolled', label: 'Enrolled', color: 'border-emerald-300' },
]

const COLUMN_INDEX: Record<string, number> = Object.fromEntries(COLUMNS.map((c, i) => [c.id, i]))

const DECISION_COLORS: Record<string, string> = {
  accepted: 'bg-emerald-600 text-white',
  rejected: 'bg-rose-600 text-white',
  waitlisted: 'bg-amber-500 text-white',
  deferred: 'bg-slate-500 text-white',
}

export function ApplicationsClient({ applications: initial }: { applications: Application[] }) {
  const { toast } = useToast()
  const [applications, setApplications] = React.useState(initial)
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const updateApp = React.useCallback(async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      if (!res.ok) throw new Error('Failed')
      // Update local state
      setApplications(prev =>
        prev.map(a => ({ ...a, ...updates, updatedAt: new Date().toISOString() }))
      )
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' })
    }
  }, [toast])

  const moveApp = async (id: string, currentStatus: string, direction: 'left' | 'right') => {
    const currentIdx = COLUMN_INDEX[currentStatus]
    const newIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1
    if (newIdx < 0 || newIdx >= COLUMNS.length) return
    const newStatus = COLUMNS[newIdx].id
    await updateApp(id, { status: newStatus })
  }

  const deleteApp = async (id: string) => {
    try {
      const res = await fetch(`/api/applications?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setApplications(prev => prev.filter(a => a.id !== id))
      toast({ title: 'Application removed' })
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  const onAdd = (app: Application) => {
    setApplications(prev => [app, ...prev])
    setAddDialogOpen(false)
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ChevronLeft className="size-4" /> Back to EduPath
          </Link>
          <h1 className="text-3xl font-bold">My Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your university applications from research to enrollment.
          </p>
        </div>
        <AddApplicationDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onAdd={onAdd} />
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-16 border rounded-xl">
          <Calendar className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Track universities you're interested in, applications you've submitted, and decisions you've received — all in one place.
          </p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4 mr-1" /> Add your first application
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {COLUMNS.map(col => {
            const appsInCol = applications.filter(a => a.status === col.id)
            return (
              <div key={col.id} className={`border-t-4 ${col.color} rounded-lg bg-slate-50 dark:bg-slate-900`}>
                <div className="p-3 border-b">
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <span className="text-xs text-muted-foreground">{appsInCol.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[100px]">
                  {appsInCol.map(app => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      onMoveLeft={COLUMN_INDEX[app.status] > 0 ? () => moveApp(app.id, app.status, 'left') : undefined}
                      onMoveRight={COLUMN_INDEX[app.status] < COLUMNS.length - 1 ? () => moveApp(app.id, app.status, 'right') : undefined}
                      onUpdate={(updates) => updateApp(app.id, updates)}
                      onDelete={() => deleteApp(app.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ApplicationCard({
  app,
  onMoveLeft,
  onMoveRight,
  onUpdate,
  onDelete,
}: {
  app: Application
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onUpdate: (updates: Record<string, unknown>) => void
  onDelete: () => void
}) {
  const [showNotes, setShowNotes] = React.useState(false)
  const [notesValue, setNotesValue] = React.useState(app.notes)
  const deadline = app.deadlineAt ? new Date(app.deadlineAt) : null
  const daysToDeadline = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="bg-white dark:bg-slate-800 border rounded-lg p-3 text-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/university/${app.university.slug}`}
          className="font-medium hover:underline flex-1 min-w-0 truncate"
        >
          {app.university.name}
        </Link>
        {app.decision && (
          <Badge className={`text-[9px] ${DECISION_COLORS[app.decision]}`}>
            {app.decision}
          </Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="size-3" /> {app.university.city}, {app.university.country}
      </div>
      {deadline && (
        <div className={`text-xs flex items-center gap-1 ${daysToDeadline !== null && daysToDeadline < 7 ? 'text-rose-600 font-medium' : 'text-muted-foreground'}`}>
          <Clock className="size-3" />
          {daysToDeadline !== null && daysToDeadline > 0
            ? `${daysToDeadline}d to deadline`
            : daysToDeadline === 0
              ? 'Deadline today!'
              : 'Deadline passed'}
        </div>
      )}

      {/* Notes toggle */}
      <button
        onClick={() => setShowNotes(!showNotes)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <StickyNote className="size-3" /> Notes
      </button>
      {showNotes && (
        <div className="space-y-1">
          <Textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            placeholder="Add notes…"
            className="min-h-[60px] text-xs"
            maxLength={5000}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs w-full"
            onClick={() => { onUpdate({ notes: notesValue }); setShowNotes(false) }}
          >
            Save notes
          </Button>
        </div>
      )}

      {/* Move buttons */}
      <div className="flex items-center gap-1 pt-2 border-t">
        {onMoveLeft && (
          <button onClick={onMoveLeft} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" aria-label="Move left">
            <ChevronLeft className="size-3" />
          </button>
        )}
        {onMoveRight && (
          <button onClick={onMoveRight} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" aria-label="Move right">
            <ChevronRight className="size-3" />
          </button>
        )}
        <a
          href={`/university/${app.university.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-muted-foreground"
          aria-label="View university"
        >
          <ExternalLink className="size-3" />
        </a>
        <button
          onClick={onDelete}
          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 rounded text-muted-foreground"
          aria-label="Delete"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}

function AddApplicationDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (app: Application) => void
}) {
  const { toast } = useToast()
  const [search, setSearch] = React.useState('')
  const [results, setResults] = React.useState<Array<{ id: string; name: string; slug: string; country: string; city: string }>>([])
  const [searching, setSearching] = React.useState(false)
  const [selectedUni, setSelectedUni] = React.useState<{ id: string; name: string; slug: string; country: string; city: string } | null>(null)
  const [deadline, setDeadline] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Debounced search
  React.useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
        const data = await res.json()
        setResults(data.universities ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleSubmit = async () => {
    if (!selectedUni) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          universityId: selectedUni.id,
          deadlineAt: deadline || null,
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      onAdd({
        id: data.id,
        status: data.status,
        decision: null,
        programId: null,
        appliedAt: null,
        deadlineAt: deadline ? new Date(deadline).toISOString() : null,
        decisionAt: null,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        university: selectedUni,
      })
      toast({ title: 'Application added', description: `Now tracking ${selectedUni.name}` })
      // Reset
      setSelectedUni(null)
      setSearch('')
      setDeadline('')
      setNotes('')
    } catch (err) {
      toast({
        title: 'Failed to add',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-1" /> Add application
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track a university application</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!selectedUni ? (
            <div className="space-y-2">
              <Label>Search for a university</Label>
              <Input
                placeholder="Type a university name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {results.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUni(u)}
                    className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm"
                  >
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.city}, {u.country}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium">{selectedUni.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedUni.city}, {selectedUni.country}</div>
                </div>
                <button onClick={() => setSelectedUni(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Application deadline (optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Need to prepare IELTS, gather transcripts, contact recommender…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={5000}
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Start tracking'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
