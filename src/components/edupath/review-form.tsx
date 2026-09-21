'use client'

import * as React from 'react'
import { X, Star, Loader2, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

type Props = {
  open: boolean
  onClose: () => void
  universityId: string
  universityName: string
  onSubmitted: () => void
}

export function ReviewForm({ open, onClose, universityId, universityName, onSubmitted }: Props) {
  const { toast } = useToast()
  const t = useTranslations('ReviewForm')
  const [ratings, setRatings] = React.useState<Record<string, number>>({
    ratingOverall: 5,
    ratingAffordability: 5,
    ratingTeaching: 5,
    ratingVisa: 5,
    ratingSafety: 5,
    ratingSocial: 5,
  })
  const [reviewText, setReviewText] = React.useState('')
  const [tags, setTags] = React.useState<string[]>([])
  const [customTag, setCustomTag] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const RATING_DIMENSIONS: Array<{ key: string; label: string; hint: string }> = [
    { key: 'ratingOverall', label: t('dimOverall'), hint: t('dimOverallHint') },
    { key: 'ratingAffordability', label: t('dimAffordability'), hint: t('dimAffordabilityHint') },
    { key: 'ratingTeaching', label: t('dimTeaching'), hint: t('dimTeachingHint') },
    { key: 'ratingVisa', label: t('dimVisa'), hint: t('dimVisaHint') },
    { key: 'ratingSafety', label: t('dimSafety'), hint: t('dimSafetyHint') },
    { key: 'ratingSocial', label: t('dimSocial'), hint: t('dimSocialHint') },
  ]

  const TAG_SUGGESTIONS = [
    t('tagAffordable'), t('tagGreatTeaching'), t('tagEasyVisa'), t('tagIntlCommunity'),
    t('tagBeautifulCampus'), t('tagGoodCareer'), t('tagHalalFriendly'), t('tagPrestigious'),
    t('tagCompetitive'), t('tagModernCampus'), t('tagExpensive'), t('tagPoorHousing'),
  ]

  React.useEffect(() => {
    if (!open) {
      setRatings({
        ratingOverall: 5, ratingAffordability: 5, ratingTeaching: 5,
        ratingVisa: 5, ratingSafety: 5, ratingSocial: 5,
      })
      setReviewText('')
      setTags([])
      setCustomTag('')
      setLoading(false)
    }
  }, [open])

  if (!open) return null

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const addCustomTag = () => {
    const newTag = customTag.trim().toLowerCase()
    if (!newTag) return
    if (tags.includes(newTag)) return
    if (tags.length >= 8) {
      toast({ title: t('maxTags'), variant: 'destructive' })
      return
    }
    setTags([...tags, newTag])
    setCustomTag('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (reviewText.trim().length < 20) {
      toast({
        title: t('reviewTooShort'),
        description: t('reviewTooShortDesc'),
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityId,
          ...ratings,
          reviewText,
          tags,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: t('submissionFailed'),
          description: data.error || t('networkErrorDesc'),
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
      toast({
        title: t('published'),
        description: t('publishedDesc'),
      })
      onSubmitted()
      onClose()
    } catch {
      toast({
        title: t('networkError'),
        description: t('networkErrorDesc'),
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl"
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
              <MessageSquarePlus className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('title')}</h2>
              <p className="text-sm text-white/85">{universityName}</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Ratings */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold">{t('ratings')}</Label>
              <div className="grid sm:grid-cols-2 gap-4">
                {RATING_DIMENSIONS.map(dim => (
                  <div key={dim.key} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{dim.label}</span>
                      <span className="text-xs text-muted-foreground">{ratings[dim.key]}/5</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2">{dim.hint}</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRatings(prev => ({ ...prev, [dim.key]: n }))}
                          className="p-0.5"
                          aria-label={`${dim.label} ${n}`}
                        >
                          <Star
                            className={cn(
                              'size-6 transition-colors',
                              n <= ratings[dim.key]
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30 hover:text-amber-300'
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Review text */}
            <div className="space-y-2">
              <Label htmlFor="review-text" className="text-sm font-semibold">
                {t('reviewText')} <span className="text-xs text-muted-foreground font-normal">{t('reviewTextHint')}</span>
              </Label>
              <Textarea
                id="review-text"
                placeholder={t('reviewTextPlaceholder')}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={5}
                maxLength={5000}
                required
              />
              <div className="text-xs text-muted-foreground text-right">
                {reviewText.length}/5000
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {t('tags')} <span className="text-xs text-muted-foreground font-normal">{t('tagsHint')}</span>
              </Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TAG_SUGGESTIONS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      tags.includes(tag)
                        ? 'bg-blue-600/10 border-blue-500 text-blue-700'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs gap-1 cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag} ✕
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={t('addCustomTag')}
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomTag()
                    }
                  }}
                  className="text-sm"
                />
                <Button type="button" size="sm" variant="outline" onClick={addCustomTag}>
                  {t('add')}
                </Button>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : t('publish')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t('footerNote')}
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
