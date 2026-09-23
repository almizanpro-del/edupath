'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, Loader2, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  onComplete: (sessionId: string, profile?: unknown) => void
}

export function RihlaChat({ onComplete }: Props) {
  const locale = useLocale()
  const t = useTranslations('Agent')
  const isRTL = locale === 'ar'

  const [messages, setMessages] = React.useState<Message[]>([
    { role: 'assistant', content: t('greeting') },
  ])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/agent/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg, language: locale }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setSessionId(data.sessionId)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])

      if (data.intakeComplete && data.sessionId) {
        // Brief delay so user sees the completion message
        setTimeout(() => onComplete(data.sessionId, data.profile), 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorOccurred'))
      // Remove the user's message since it failed
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto shadow-lg" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <Avatar>
          <AvatarFallback className="bg-white/15 text-white border border-white/20">
            <Sparkles className="size-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">رِحلة · Rihla</h3>
            <Badge className="bg-orange-500 text-white text-[10px]">{t('badge')}</Badge>
          </div>
          <p className="text-xs text-white/70">{t('subtitle')}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2',
                m.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {m.role === 'assistant' && (
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    <Sparkles className="size-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                dir="auto"
                className={cn(
                  'rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-800 rounded-bl-sm'
                )}
              >
                {m.content.split('```json')[0].trim()}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start gap-2">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  <Sparkles className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="size-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="text-center text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-lg p-2">
              {error}
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder={t('placeholder')}
          dir="auto"
          disabled={loading}
          className="rounded-full"
        />
        <Button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          size="icon"
          className="rounded-full shrink-0 bg-blue-600 hover:bg-blue-700"
          aria-label={t('startChat')}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className={cn('size-4', isRTL && 'rotate-180')} />}
        </Button>
      </div>
    </Card>
  )
}
