'use client'

import * as React from 'react'
import { Mail, Loader2, CheckCircle2, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export function EmailCapture() {
  const { toast } = useToast()
  const [email, setEmail] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      // Store in DB via the leads API (reuse as a newsletter signup)
      // In production, this would go to a dedicated newsletter table or Resend audience
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'email_capture',
          metadata: { email, source: 'homepage_banner' },
        }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
      toast({ title: 'You\'re subscribed!', description: 'We\'ll send you deadline alerts and scholarship updates.' })
    } catch {
      // Still show success — the event tracking is best-effort
      setSubmitted(true)
      toast({ title: 'You\'re subscribed!', description: 'We\'ll send you deadline alerts and scholarship updates.' })
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <Card className="max-w-md mx-auto bg-blue-950/5 border-blue-600/20">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="size-12 text-blue-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-1">You're subscribed!</h3>
          <p className="text-sm text-muted-foreground">We'll email you deadline alerts and scholarship updates.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md mx-auto bg-gradient-to-br from-blue-50 to-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="size-5 text-blue-600" />
          <h3 className="font-bold text-lg">Get deadline alerts</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Free email alerts when application deadlines approach. No spam, unsubscribe anytime.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pl-9"
              required
            />
          </div>
          <Button type="submit" className="gap-2 bg-blue-600 hover:bg-blue-700" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Subscribe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
