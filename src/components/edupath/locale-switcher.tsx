'use client'

import * as React from 'react'
import { Globe2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export function LocaleSwitcher({ className }: Props) {
  const [locale, setLocale] = React.useState<'en' | 'ar'>('en')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const stored = document.cookie
      .split('; ')
      .find((c) => c.startsWith('locale='))
      ?.split('=')[1] as 'en' | 'ar' | undefined
    if (stored) setLocale(stored)
  }, [])

  const change = (newLocale: 'en' | 'ar') => {
    // Set cookie (1 year expiry)
    document.cookie = `locale=${newLocale};path=/;max-age=31536000;samesite=lax`
    setLocale(newLocale)
    // Reload to pick up new locale from server
    window.location.reload()
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className={cn('gap-1', className)}>
        <Globe2 className="size-4" />
        <span className="text-xs">EN</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('gap-1', className)}>
          <Globe2 className="size-4" />
          <span className="text-xs font-semibold uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => change('en')} className={cn(locale === 'en' && 'font-bold')}>
          🇬🇧 English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => change('ar')} className={cn(locale === 'ar' && 'font-bold')}>
          🇸🇦 العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
