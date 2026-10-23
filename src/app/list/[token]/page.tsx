/**
 * /list/[token]
 *
 * Public, read-only view of a shared university shortlist. Anyone with
 * the link can view the list — no authentication required.
 *
 * Shows: list name, university cards (name, country, tuition, rating),
 * and a CTA to sign up / browse more on EduPath.
 */
import { Metadata } from 'next'
import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GraduationCap, MapPin, Wallet, Star, ArrowRight } from 'lucide-react'
import { formatUsd } from '@/lib/edupath'

type Props = { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  try {
    const list = await db.savedList.findUnique({
      where: { shareToken: token },
      select: { listName: true },
    })
    if (!list) return { title: 'List not found' }
    return {
      title: `${list.listName} — Shared Shortlist on EduPath`,
      description: 'A curated list of universities shared via EduPath.',
      robots: { index: false, follow: true }, // don't index private lists
    }
  } catch {
    return { title: 'Shared Shortlist' }
  }
}

export default async function SharedListPage({ params }: Props) {
  const { token } = await params

  let listName = 'Shared Shortlist'
  let universityIds: string[] = []

  try {
    const list = await db.savedList.findUnique({
      where: { shareToken: token },
      select: { listName: true, universities: true },
    })
    if (!list) notFound()
    listName = list.listName
    universityIds = JSON.parse(list.universities)
  } catch {
    notFound()
  }

  // Load the universities (from DB or static fallback)
  let universities: Array<{
    id: string; name: string; slug: string; country: string; city: string
    tuitionUsd: number; livingCostUsd: number; descriptionEn: string | null
  }> = []

  if (universityIds.length > 0) {
    try {
      universities = await db.university.findMany({
        where: { id: { in: universityIds }, pendingReview: false },
        select: {
          id: true, name: true, slug: true, country: true, city: true,
          tuitionUsd: true, livingCostUsd: true, descriptionEn: true,
        },
      })
    } catch {
      // Static fallback
      universities = (staticUniversities as Array<{
        id: string; name: string; slug: string; country: string; city: string
        tuitionUsd: number; livingCostUsd: number; descriptionEn: string | null
      }>).filter(u => universityIds.includes(u.id))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b">
        <div className="container mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <GraduationCap className="size-5 text-white" />
            </div>
            <span className="font-bold">EduPath</span>
          </div>
          <h1 className="text-2xl font-bold">{listName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A shared university shortlist from EduPath — {universities.length} university{universities.length !== 1 ? 'ies' : ''}
          </p>
        </div>
      </header>

      {/* University list */}
      <main className="container mx-auto max-w-5xl px-4 py-8">
        {universities.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="size-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">This list is empty</h3>
            <p className="text-sm text-muted-foreground">The owner hasn't added any universities yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {universities.map(u => (
              <Link
                key={u.id}
                href={`/university/${u.slug}`}
                className="group bg-white dark:bg-slate-900 border rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold group-hover:text-blue-600 transition-colors">{u.name}</h3>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" /> {u.city}, {u.country}
                  </span>
                </div>
                {u.descriptionEn && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{u.descriptionEn}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Tuition</span>
                    <span className="font-semibold text-blue-600">{formatUsd(u.tuitionUsd)}/yr</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Living</span>
                    <span className="font-semibold">{formatUsd(u.livingCostUsd)}/yr</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center bg-white dark:bg-slate-900 border rounded-xl p-8">
          <h2 className="text-xl font-bold mb-2">Find your perfect university</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            EduPath helps MENA students find affordable universities abroad with verified data,
            scholarship matching, and AI-powered guidance.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Start exploring <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}
