'use client'

import * as React from 'react'
import { Share2, MessageCircle, Facebook, Twitter, Link2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Props = {
  url: string
  title: string
  description?: string
}

export function SocialShare({ url, title, description }: Props) {
  const { toast } = useToast()
  const [copied, setCopied] = React.useState(false)

  const shareUrl = encodeURIComponent(url)
  const shareTitle = encodeURIComponent(title)
  const shareDesc = encodeURIComponent(description ?? '')

  const links = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'hover:bg-green-50 hover:text-green-600',
      href: `https://wa.me/?text=${shareTitle}%20${shareUrl}`,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'hover:bg-blue-50 hover:text-blue-600',
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTitle}`,
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'hover:bg-sky-50 hover:text-sky-500',
      href: `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`,
    },
  ]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast({ title: 'Link copied!', description: 'Share it with your friends and family.' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' })
    }
  }

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url })
      } catch {
        // User cancelled — no action needed
      }
    } else {
      copyLink()
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="flex items-center gap-1 text-sm text-muted-foreground mr-1">
        <Share2 className="size-4" />
        Share:
      </span>
      {/* Native share for mobile */}
      {typeof navigator !== 'undefined' && navigator.share && (
        <Button variant="outline" size="sm" onClick={nativeShare} className="gap-2 md:hidden">
          <Share2 className="size-4" /> Share
        </Button>
      )}
      {/* Social buttons for desktop */}
      <div className="flex items-center gap-1">
        {links.map(link => (
          <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" title={link.name}>
            <Button variant="ghost" size="icon" className={cn('size-9', link.color)}>
              <link.icon className="size-4" />
            </Button>
          </a>
        ))}
        <Button variant="ghost" size="icon" onClick={copyLink} className="size-9 hover:bg-slate-100" title="Copy link">
          {copied ? <Check className="size-4 text-emerald-600" /> : <Link2 className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
