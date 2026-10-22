'use client'

/**
 * Admin claims review client.
 * Lists all university ownership claims with approve/reject actions.
 */
import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft, Building2, Mail, User, ExternalLink,
  Check, X, Loader2, Clock,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Claim = {
  id: string
  universityId: string | null
  universityName: string
  universitySlug: string
  universityCountry: string
  claimantName: string
  claimantEmail: string
  officialName: string
  officialEmail: string
  officialTitle: string | null
  proofUrl: string | null
  status: string
  submittedAt: string
}

export function AdminClaimsClient({ claims }: { claims: Claim[] }) {
  const { toast } = useToast()
  const [processing, setProcessing] = React.useState<string | null>(null)
  const [localClaims, setLocalClaims] = React.useState(claims)

  const handleAction = async (claimId: string, action: 'approve' | 'reject') => {
    setProcessing(claimId)
    try {
      const res = await fetch('/api/claim', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ claimId, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      // Update local state
      setLocalClaims(prev =>
        prev.map(c => (c.id === claimId ? { ...c, status: action === 'approve' ? 'approved' : 'rejected' } : c))
      )

      toast({
        title: action === 'approve' ? 'Claim approved' : 'Claim rejected',
        description:
          action === 'approve'
            ? 'User promoted to recruiter. University marked as claimed.'
            : 'Claim has been rejected.',
      })
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const pending = localClaims.filter(c => c.status === 'pending')
  const resolved = localClaims.filter(c => c.status !== 'pending')

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 space-y-8">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-4" /> Back to Admin
        </Link>
        <h1 className="text-3xl font-bold">University Claims</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve ownership claims from university representatives.
        </p>
      </div>

      {localClaims.length === 0 ? (
        <div className="text-center py-16 border rounded-xl">
          <Building2 className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No claims yet</h3>
          <p className="text-sm text-muted-foreground">
            When a university representative submits an ownership claim, it will appear here for review.
          </p>
        </div>
      ) : (
        <>
          {/* Pending claims */}
          {pending.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-amber-600" />
                <h2 className="text-lg font-semibold">Pending ({pending.length})</h2>
              </div>
              <div className="space-y-3">
                {pending.map(claim => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    onAction={handleAction}
                    processing={processing === claim.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Resolved claims */}
          {resolved.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Resolved ({resolved.length})</h2>
              <div className="space-y-3">
                {resolved.map(claim => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    onAction={handleAction}
                    processing={processing === claim.id}
                    readonly
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ClaimCard({
  claim,
  onAction,
  processing,
  readonly = false,
}: {
  claim: Claim
  onAction: (id: string, action: 'approve' | 'reject') => void
  processing: boolean
  readonly?: boolean
}) {
  const date = new Date(claim.submittedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link
              href={`/university/${claim.universitySlug}`}
              className="font-semibold hover:underline"
            >
              {claim.universityName}
            </Link>
            <Badge variant="outline">{claim.universityCountry}</Badge>
            {claim.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
            {claim.status === 'approved' && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>
            )}
            {claim.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">Submitted {date}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        {/* Claimant */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Claimant Account
          </h4>
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <span>{claim.claimantName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <a href={`mailto:${claim.claimantEmail}`} className="hover:underline truncate">
              {claim.claimantEmail}
            </a>
          </div>
        </div>

        {/* Official info */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Official Position
          </h4>
          <div>
            <span className="font-medium">{claim.officialName}</span>
            {claim.officialTitle && (
              <span className="text-muted-foreground"> — {claim.officialTitle}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <a href={`mailto:${claim.officialEmail}`} className="hover:underline truncate">
              {claim.officialEmail}
            </a>
          </div>
          {claim.proofUrl && (
            <a
              href={claim.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
            >
              <ExternalLink className="size-3" /> View proof
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      {!readonly && claim.status === 'pending' && (
        <div className="flex items-center gap-2 pt-3 border-t">
          <Button
            size="sm"
            onClick={() => onAction(claim.id, 'approve')}
            disabled={processing}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {processing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(claim.id, 'reject')}
            disabled={processing}
          >
            <X className="size-4" />
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}
