'use client'

/**
 * Compare page client. Shows a side-by-side table of up to 3 universities
 * with a search interface to pick which ones to compare.
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Search, X, GraduationCap, Wallet, Award, Users, Globe, Star, ExternalLink } from 'lucide-react'

type Program = {
  id: string; name: string; degreeLevel: string; field: string
  tuitionUsd: number; language: string; durationMonths: number; deadline: string | null
}

type Scholarship = {
  id: string; name: string; amountUsd: number; amountType: string; deadline: string | null
}

type CompareUniversity = {
  id: string; slug: string; name: string; country: string; city: string; website: string
  tuitionUsd: number; livingCostUsd: number; intlStudentPct: number; acceptanceRate: number | null
  descriptionEn: string | null
  programs: Program[]
  scholarships: Scholarship[]
  reviews: Array<{ ratingOverall: number }>
}

type PickerUniversity = {
  slug: string; name: string; country: string; city: string; tuitionUsd: number
}

export function CompareClient({
  selected,
  allUniversities,
}: {
  selected: CompareUniversity[]
  allUniversities: PickerUniversity[]
}) {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const [pickerOpen, setPickerOpen] = React.useState(selected.length === 0)

  const filtered = allUniversities
    .filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.country.toLowerCase().includes(search.toLowerCase()) ||
      u.city.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 50)

  const addUniversity = (slug: string) => {
    const currentSlugs = selected.map(u => u.slug)
    if (currentSlugs.includes(slug) || currentSlugs.length >= 4) return
    const newSlugs = [...currentSlugs, slug].join(',')
    router.push(`/compare?ids=${newSlugs}`)
    setPickerOpen(false)
    setSearch('')
  }

  const removeUniversity = (slug: string) => {
    const newSlugs = selected.map(u => u.slug).filter(s => s !== slug).join(',')
    router.push(newSlugs ? `/compare?ids=${newSlugs}` : '/compare')
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="size-4" /> Back to EduPath
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Compare Universities</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Side-by-side comparison of up to 4 universities.
          </p>
        </div>
        {selected.length > 0 && selected.length < 4 && (
          <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            <Search className="size-4 mr-1" /> Add university
          </Button>
        )}
      </div>

      {/* Picker */}
      {pickerOpen && (
        <div className="border rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {selected.length === 0 ? 'Pick universities to compare' : `Add a ${selected.length + 1}${selected.length + 1 === 2 ? 'nd' : selected.length + 1 === 3 ? 'rd' : 'th'} university`}
            </h3>
            <button onClick={() => setPickerOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <Input
            placeholder="Search by name, country, or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filtered.map(u => (
              <button
                key={u.slug}
                onClick={() => addUniversity(u.slug)}
                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-medium text-sm">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.city}, {u.country}</div>
                </div>
                <div className="text-sm font-medium text-blue-600">${u.tuitionUsd.toLocaleString()}/yr</div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No universities found.</p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {selected.length === 0 && !pickerOpen && (
        <div className="text-center py-16 border rounded-xl">
          <GraduationCap className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No universities selected</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Pick up to 3 universities to compare tuition, programs, scholarships, and reviews side by side.
          </p>
          <Button onClick={() => setPickerOpen(true)}>
            <Search className="size-4 mr-1" /> Find universities
          </Button>
        </div>
      )}

      {/* Comparison table */}
      {selected.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 border-b w-40 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Feature
                </th>
                {selected.map(u => (
                  <th key={u.id} className="p-4 border-b min-w-[240px] align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/university/${u.slug}`}
                          className="font-bold text-base hover:underline"
                        >
                          {u.name}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">{u.city}, {u.country}</div>
                      </div>
                      <button
                        onClick={() => removeUniversity(u.slug)}
                        className="text-muted-foreground hover:text-rose-600 shrink-0"
                        aria-label={`Remove ${u.name}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Tuition */}
              <CompareRow label="Tuition / year" icon={<Wallet className="size-3.5" />}>
                {selected.map(u => (
                  <td key={u.id} className="p-4 border-b">
                    <span className="text-lg font-bold text-blue-600">${u.tuitionUsd.toLocaleString()}</span>
                  </td>
                ))}
              </CompareRow>

              {/* Living cost */}
              <CompareRow label="Living cost / year" icon={<Wallet className="size-3.5" />}>
                {selected.map(u => (
                  <td key={u.id} className="p-4 border-b">
                    <span className="font-medium">${u.livingCostUsd.toLocaleString()}</span>
                  </td>
                ))}
              </CompareRow>

              {/* Total annual cost */}
              <CompareRow label="Total annual cost" icon={<Wallet className="size-3.5" />}>
                {selected.map(u => (
                  <td key={u.id} className="p-4 border-b">
                    <span className="font-semibold">${(u.tuitionUsd + u.livingCostUsd).toLocaleString()}</span>
                  </td>
                ))}
              </CompareRow>

              {/* International students */}
              <CompareRow label="International students" icon={<Users className="size-3.5" />}>
                {selected.map(u => (
                  <td key={u.id} className="p-4 border-b">{u.intlStudentPct}%</td>
                ))}
              </CompareRow>

              {/* Acceptance rate */}
              <CompareRow label="Acceptance rate" icon={<GraduationCap className="size-3.5" />}>
                {selected.map(u => (
                  <td key={u.id} className="p-4 border-b">
                    {u.acceptanceRate ? `${u.acceptanceRate}%` : '—'}
                  </td>
                ))}
              </CompareRow>

              {/* Reviews */}
              <CompareRow label="Avg rating" icon={<Star className="size-3.5" />}>
                {selected.map(u => {
                  const avg = u.reviews.length > 0
                    ? (u.reviews.reduce((s, r) => s + r.ratingOverall, 0) / u.reviews.length).toFixed(1)
                    : null
                  return (
                    <td key={u.id} className="p-4 border-b">
                      {avg ? (
                        <span className="font-medium">{avg}/5 ({u.reviews.length} reviews)</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">No reviews yet</span>
                      )}
                    </td>
                  )
                })}
              </CompareRow>

              {/* Programs count */}
              <CompareRow label="Programs" icon={<GraduationCap className="size-3.5" />}>
                {selected.map(u => (
                  <td key={u.id} className="p-4 border-b">{u.programs.length} programs</td>
                ))}
              </CompareRow>

              {/* Cheapest program */}
              <CompareRow label="Cheapest program" icon={<GraduationCap className="size-3.5" />}>
                {selected.map(u => {
                  const cheapest = u.programs.length > 0
                    ? Math.min(...u.programs.map(p => p.tuitionUsd))
                    : null
                  return (
                    <td key={u.id} className="p-4 border-b">
                      {cheapest ? `$${cheapest.toLocaleString()}/yr` : '—'}
                    </td>
                  )
                })}
              </CompareRow>

              {/* Scholarships */}
              <CompareRow label="Scholarships" icon={<Award className="size-3.5" />}>
                {selected.map(u => (
                  <td key={u.id} className="p-4 border-b">{u.scholarships.length} available</td>
                ))}
              </CompareRow>

              {/* Website */}
              <CompareRow label="Website" icon={<Globe className="size-3.5" />}>
                {selected.map(u => (
                  <td key={u.id} className="p-4 border-b">
                    <a
                      href={u.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                    >
                      Visit <ExternalLink className="size-3" />
                    </a>
                  </td>
                ))}
              </CompareRow>

              {/* CTA */}
              <tr>
                <td className="p-4"></td>
                {selected.map(u => (
                  <td key={u.id} className="p-4">
                    <Button size="sm" asChild className="w-full">
                      <Link href={`/university/${u.slug}`}>View details</Link>
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CompareRow({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <tr>
      <td className="p-4 border-b text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {icon}
          {label}
        </div>
      </td>
      {children}
    </tr>
  )
}
