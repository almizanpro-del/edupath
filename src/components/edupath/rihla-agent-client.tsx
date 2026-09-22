'use client'

import * as React from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useTranslations, useLocale } from 'next-intl'
import { RihlaChat } from './rihla-chat'
import { RihlaResults } from './rihla-results'

type Phase = 'chat' | 'results'

export function RihlaAgentClient() {
  const router = useRouter()
  const t = useTranslations('Agent')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [phase, setPhase] = React.useState<Phase>('chat')
  const [sessionId, setSessionId] = React.useState<string | null>(null)

  const handleComplete = (sid: string) => {
    setSessionId(sid)
    setPhase('results')
  }

  const handleStartOver = () => {
    setSessionId(null)
    setPhase('chat')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className={isRTL ? 'size-4 rotate-180' : 'size-4'} /> {t('back')}
          </Button>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="font-bold">رِحلة · Rihla</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {phase === 'chat' ? (
          <div className="space-y-4">
            {/* Hero */}
            <div className="text-center mb-6">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('title')}</h1>
              <p className="text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
            </div>
            <RihlaChat onComplete={handleComplete} />
            <p className="text-center text-xs text-muted-foreground">
              {t('anonymousNote')}
            </p>
          </div>
        ) : (
          sessionId && (
            <RihlaResults sessionId={sessionId} onStartOver={handleStartOver} />
          )
        )}
      </div>
    </div>
  )
}
