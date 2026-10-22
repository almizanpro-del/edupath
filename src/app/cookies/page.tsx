/**
 * /cookies — Cookie Policy
 *
 * Explains what cookies/localStorage EduPath uses, why, and how to
 * control them. Pairs with the cookie consent banner.
 */
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How EduPath uses cookies and local storage.',
  robots: { index: true, follow: true },
}

export default async function CookiesPage() {
  const t = await getTranslations('Legal.cookies')

  const sections = [
    { id: 'what', title: t('sections.what.title'), body: t('sections.what.body') },
    { id: 'types', title: t('sections.types.title'), body: t('sections.types.body') },
    { id: 'table', title: t('sections.table.title'), body: t('sections.table.body') },
    { id: 'third', title: t('sections.third.title'), body: t('sections.third.body') },
    { id: 'control', title: t('sections.control.title'), body: t('sections.control.body') },
    { id: 'changes', title: t('sections.changes.title'), body: t('sections.changes.body') },
  ]

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="size-4" /> Back to EduPath
      </Link>

      <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('effectiveDate')}</p>

      <p className="text-base text-muted-foreground mb-8 leading-relaxed">{t('intro')}</p>

      <div className="space-y-8">
        {sections.map(s => (
          <section key={s.id} id={s.id} className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3">{s.title}</h2>
            <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
