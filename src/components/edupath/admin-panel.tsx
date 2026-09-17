'use client'

import * as React from 'react'
import { X, Shield, Check, XCircle, Loader2, Inbox, Clock, Star, MapPin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { countryFlag } from '@/lib/edupath'
import { cn } from '@/lib/utils'

type PendingReview = {
  id: string
  userName: string
  userEmail: string
  userCountry: string
  universityId: string
  universityName: string
  universityCountry: string
  ratingOverall: number
  ratingAffordability: number
  ratingVisa: number
  ratingTeaching: number
  ratingSafety: number
  ratingSocial: number
  reviewText: string
  helpfulCount: number
  verifiedEnrollment: boolean
  moderationStatus: string
  tags: string[]
  createdAt: string
}

type Props = {
  open: boolean
  onClose: () => void
}

export function AdminPanel({ open, onClose }: Props) {
  const { toast } = useToast()
  const [reviews, setReviews] = React.useState<PendingReview[]>([])
  const [loading, setLoading] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  const loadPending = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reviews?pending=true')
      if (!res.ok) {
        const data = await res.json()
        toast({
          title: 'Failed to load pending reviews',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        })
        setReviews([])
        return
      }
      const data = await res.json()
      setReviews(data.reviews ?? [])
    } catch (e) {
      toast({
        title: 'Network error',
        description: 'Could not reach server.',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }, [toast])

  React.useEffect(() => {
    if (open) loadPending()
  }, [open, loadPending])

  if (!open) return null

  const moderate = async (reviewId: string, action: 'approve' | 'reject') => {
    setActionLoading(reviewId)
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: 'Moderation failed',
          description: data.error,
          variant: 'destructive',
        })
        return
      }
      toast({
        title: action === 'approve' ? 'Review approved' : 'Review rejected',
        description: `Review by ${reviews.find(r => r.id === reviewId)?.userName} has been ${action}d.`,
      })
      // Remove from list
      setReviews(prev => prev.filter(r => r.id !== reviewId))
    } catch (e) {
      toast({
        title: 'Network error',
        description: 'Could not reach server.',
        variant: 'destructive',
      })
    }
    setActionLoading(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Shield className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Admin: Review Moderation</h2>
              <p className="text-sm text-white/85">
                {reviews.length > 0
                  ? `${reviews.length} review${reviews.length > 1 ? 's' : ''} awaiting moderation`
                  : 'No pending reviews — all caught up!'}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b px-6 py-3 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Inbox className="size-4" />
            <span>Pending queue</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadPending} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {loading && reviews.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading pending reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-lg font-semibold mb-1">All caught up!</h3>
                <p className="text-sm text-muted-foreground">
                  No reviews are pending moderation. New submissions will appear here automatically.
                </p>
              </div>
            ) : (
              reviews.map(r => (
                <ReviewModerationCard
                  key={r.id}
                  review={r}
                  onApprove={() => moderate(r.id, 'approve')}
                  onReject={() => moderate(r.id, 'reject')}
                  actionLoading={actionLoading === r.id}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function ReviewModerationCard({
  review, onApprove, onReject, actionLoading,
}: {
  review: PendingReview
  onApprove: () => void
  onReject: () => void
  actionLoading: boolean
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header: user + university */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-sm font-bold">
            {review.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{review.userName}</span>
              {review.verifiedEnrollment && (
                <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500 text-emerald-700">
                  <Check className="size-3" /> Verified
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" /> {review.userCountry}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" /> {new Date(review.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{review.userEmail}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            {review.ratingOverall}/5
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
            {countryFlag(review.universityCountry)} {review.universityName}
          </div>
        </div>
      </div>

      <Separator />

      {/* Review text */}
      <div>
        <p className="text-sm leading-relaxed">{review.reviewText}</p>
      </div>

      {/* Tags */}
      {review.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Sub-ratings */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <SubRating label="Afford" value={review.ratingAffordability} />
        <SubRating label="Teaching" value={review.ratingTeaching} />
        <SubRating label="Visa" value={review.ratingVisa} />
        <SubRating label="Safety" value={review.ratingSafety} />
        <SubRating label="Social" value={review.ratingSocial} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          size="sm"
          variant="default"
          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={onApprove}
          disabled={actionLoading}
        >
          {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onClick={onReject}
          disabled={actionLoading}
        >
          {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
          Reject
        </Button>
      </div>
    </div>
  )
}

function SubRating({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded p-1.5 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold">{value}/5</div>
    </div>
  )
}
