'use client'

/**
 * 4-step onboarding wizard. Saves to PATCH /api/me/profile on completion.
 * Each step has its own validation. The "Skip" link at the bottom lets
 * users bail without completing (we still save what they entered).
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft, ChevronRight, GraduationCap, Globe, Wallet,
  Sparkles, Loader2, Check,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const COUNTRIES = [
  'Turkey', 'Germany', 'United Kingdom', 'Poland', 'United Arab Emirates',
  'Egypt', 'Malaysia', 'Jordan', 'Lebanon', 'Russia', 'Georgia',
  'Lithuania', 'Uzbekistan', 'Kazakhstan', 'United States', 'Canada',
  'Australia', 'Netherlands', 'France', 'Italy', 'Spain', 'Sweden',
]

const FIELDS = [
  'Computer Science', 'Engineering', 'Business', 'Medicine',
  'Law', 'Architecture', 'Arts & Design', 'Social Sciences',
  'Natural Sciences', 'Education', 'Pharmacy', 'Dentistry',
]

const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High school student' },
  { value: 'bachelor', label: "Bachelor's degree" },
  { value: 'master', label: "Master's degree" },
  { value: 'phd', label: 'PhD' },
]

const BUDGET_RANGES = [
  { value: 5000, label: 'Up to $5,000/year', desc: 'Very budget-friendly' },
  { value: 10000, label: 'Up to $10,000/year', desc: 'Budget-friendly' },
  { value: 20000, label: 'Up to $20,000/year', desc: 'Mid-range' },
  { value: 40000, label: 'Up to $40,000/year', desc: 'Premium' },
  { value: 80000, label: '$80,000+/ear', desc: 'No budget limit' },
]

type Props = {
  profileId: string | null
  initialName: string
}

export function OnboardingClient({ profileId, initialName }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)

  // Form state
  const [nationality, setNationality] = React.useState('')
  const [educationLevel, setEducationLevel] = React.useState('')
  const [field, setField] = React.useState('')
  const [preferredCountries, setPreferredCountries] = React.useState<string[]>([])
  const [budgetUsd, setBudgetUsd] = React.useState<number | ''>('')

  const totalSteps = 4

  const toggleCountry = (c: string) => {
    setPreferredCountries(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  const canProceed = () => {
    if (step === 0) return !!nationality
    if (step === 1) return !!educationLevel && !!field
    if (step === 2) return preferredCountries.length > 0
    if (step === 3) return budgetUsd !== '' && budgetUsd > 0
    return false
  }

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1)
    } else {
      handleSave()
    }
  }

  const handleSave = async (skip = false) => {
    if (!profileId) {
      // DB unavailable — just go home.
      toast({
        title: 'Welcome to EduPath!',
        description: 'Your preferences will be saved once you sign in next time.',
      })
      router.push('/')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nationality: skip ? null : nationality,
          educationLevel: skip ? null : educationLevel,
          fieldOfInterest: skip ? null : field,
          preferredCountries: skip ? [] : preferredCountries,
          budgetUsd: skip ? null : (budgetUsd === '' ? null : Number(budgetUsd)),
        }),
      })

      if (!res.ok) throw new Error('Failed to save preferences')

      toast({
        title: skip ? 'Skipped for now' : "You're all set!",
        description: skip
          ? 'You can complete your profile later in Account Settings.'
          : 'Your university directory is now personalized.',
      })
      router.push('/')
    } catch (err) {
      toast({
        title: 'Could not save preferences',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex size-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 items-center justify-center mb-4">
            <GraduationCap className="size-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Welcome, {initialName}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Let's personalize your EduPath experience. Takes 2 minutes.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 sm:p-8 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="size-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Where are you from?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                This helps us show you visa requirements and scholarships specific to your nationality.
              </p>
              <div className="space-y-2">
                <Label htmlFor="nationality">Your nationality</Label>
                <select
                  id="nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-transparent text-sm"
                >
                  <option value="">Select your country…</option>
                  <optgroup label="MENA (most common)">
                    <option>Jordan</option>
                    <option>Egypt</option>
                    <option>Saudi Arabia</option>
                    <option>UAE</option>
                    <option>Qatar</option>
                    <option>Kuwait</option>
                    <option>Bahrain</option>
                    <option>Oman</option>
                    <option>Morocco</option>
                    <option>Tunisia</option>
                    <option>Algeria</option>
                    <option>Iraq</option>
                    <option>Palestine</option>
                    <option>Yemen</option>
                    <option>Syria</option>
                    <option>Libya</option>
                    <option>Sudan</option>
                    <option>Lebanon</option>
                  </optgroup>
                  <optgroup label="Other countries">
                    {COUNTRIES.filter(c => !['Jordan', 'Egypt', 'Lebanon'].includes(c)).map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Your education & field</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                What's your current education level and what do you want to study?
              </p>
              <div className="space-y-3">
                <Label>Current education level</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {EDUCATION_LEVELS.map(lvl => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setEducationLevel(lvl.value)}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        educationLevel === lvl.value
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                          : 'hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="font-medium text-sm">{lvl.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Field of interest</Label>
                <div className="flex flex-wrap gap-2">
                  {FIELDS.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setField(f)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        field === f
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="size-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Where do you want to study?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Pick one or more destination countries. You can change this later.
              </p>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map(c => {
                  const selected = preferredCountries.includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCountry(c)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {selected && <Check className="size-3 inline mr-1" />}
                      {c}
                    </button>
                  )
                })}
              </div>
              {preferredCountries.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {preferredCountries.length} country{preferredCountries.length !== 1 ? 'ies' : ''} selected
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="size-5 text-blue-600" />
                <h2 className="text-xl font-semibold">What's your annual budget?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Include tuition + living expenses. This helps us filter out universities you can't afford.
              </p>
              <div className="space-y-2">
                {BUDGET_RANGES.map(b => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBudgetUsd(b.value)}
                    className={`w-full p-4 border rounded-lg text-left transition-colors flex items-center justify-between ${
                      budgetUsd === b.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{b.label}</div>
                      <div className="text-xs text-muted-foreground">{b.desc}</div>
                    </div>
                    {budgetUsd === b.value && <Check className="size-5 text-blue-600" />}
                  </button>
                ))}
              </div>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:underline">Enter a custom amount instead</summary>
                <div className="mt-2">
                  <Label htmlFor="custom-budget">Custom annual budget (USD)</Label>
                  <Input
                    id="custom-budget"
                    type="number"
                    min={0}
                    step={1000}
                    value={budgetUsd}
                    onChange={(e) => setBudgetUsd(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 15000"
                  />
                </div>
              </details>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
                disabled={saving}
              >
                <ChevronLeft className="size-4" /> Back
              </Button>
            ) : (
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Skip for now
              </button>
            )}
            <Button onClick={handleNext} disabled={!canProceed() || saving}>
              {saving ? (
                <><Loader2 className="size-4 animate-spin" /> Saving…</>
              ) : step === totalSteps - 1 ? (
                <><Sparkles className="size-4 mr-1" /> Finish</>
              ) : (
                <>Next <ChevronRight className="size-4" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
