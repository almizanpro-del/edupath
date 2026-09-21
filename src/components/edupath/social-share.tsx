'use client'

import * as React from 'react'
import { Share2, MessageCircle, Facebook, Twitter, Link2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type Props = {
  url: string
  title: string
  description?: string
}

export function SocialShare({ url, title, description }: Props) {
  const { toast } = useToast()
  const t = useTranslations('SocialShare')
  const [copied, setCopied] = React.useState(false)

  const shareUrl = encodeURIComponent(url)
  const shareTitle = encodeURIComponent(title)

  const links = [
    {
      name: t('whatsapp'),
      icon: MessageCircle,
      color: 'hover:bg-orange-950/5 hover:text-orange-600',
      href: `https://wa.me/?text=${shareTitle}%20${shareUrl}`,
    },
    {
      name: t('facebook'),
      icon: Facebook,
      color: 'hover:bg-blue-950/5 hover:text-blue-600',
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTitle}`,
    },
    {
      name: t('twitter'),
      icon: Twitter,
      color: 'hover:bg-slate-100 hover:text-slate-700',
      href: `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`,
    },
  ]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast({ title: t('copied'), description: t('copiedDesc') })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: t('copyFailed'), variant: 'destructive' })
    }
  }

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
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
        {t('label')}
      </span>
      {/* Native share for mobile */}
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
        <Button variant="outline" size="sm" onClick={nativeShare} className="gap-2 md:hidden">
          <Share2 className="size-4" /> {t('share')}
        </Button>
      )}
      {/* Social buttons for desktop */}
      <div className="flex items-center gap-1">
        {links.map(link => (
          <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.name} title={link.name}>
            <Button variant="ghost" size="icon" className={cn('size-9', link.color)}>
              <link.icon className="size-4" />
            </Button>
          </a>
        ))}
        <Button variant="ghost" size="icon" onClick={copyLink} className="size-9 hover:bg-slate-100" aria-label={t('copyLink')}>
          {copied ? <Check className="size-4 text-blue-600" /> : <Link2 className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
