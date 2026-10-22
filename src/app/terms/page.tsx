/**
 * /terms — Terms of Service
 *
 * Covers: acceptance, eligibility, accounts, acceptable use, content
 * (reviews, essays), intellectual property, disclaimers, limitation
 * of liability, termination, governing law, disputes.
 */
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms and conditions governing your use of EduPath.',
  robots: { index: true, follow: true },
}

export default async function TermsPage() {
  const t = await getTranslations('Legal.terms')

  const sections = [
    { id: 'acceptance', title: t('sections.acceptance.title'), body: t('sections.acceptance.body') },
    { id: 'eligibility', title: t('sections.eligibility.title'), body: t('sections.eligibility.body') },
    { id: 'accounts', title: t('sections.accounts.title'), body: t('sections.accounts.body') },
    { id: 'use', title: t('sections.use.title'), body: t('sections.use.body') },
    { id: 'content', title: t('sections.content.title'), body: t('sections.content.body') },
    { id: 'reviews', title: t('sections.reviews.title'), body: t('sections.reviews.body') },
    { id: 'ip', title: t('sections.ip.title'), body: t('sections.ip.body') },
    { id: 'disclaimer', title: t('sections.disclaimer.title'), body: t('sections.disclaimer.body') },
    { id: 'liability', title: t('sections.liability.title'), body: t('sections.liability.body') },
    { id: 'indemnity', title: t('sections.indemnity.title'), body: t('sections.indemnity.body') },
    { id: 'termination', title: t('sections.termination.title'), body: t('sections.termination.body') },
    { id: 'law', title: t('sections.law.title'), body: t('sections.law.body') },
    { id: 'changes', title: t('sections.changes.title'), body: t('sections.changes.body') },
    { id: 'contact', title: t('sections.contact.title'), body: t('sections.contact.body') },
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

      <div className="mt-12 pt-8 border-t text-sm text-muted-foreground">
        <p>{t('footer.contact')}: <a href="mailto:legal@edupath.com" className="text-blue-600 hover:underline">legal@edupath.com</a></p>
      </div>
    </div>
  )
}
