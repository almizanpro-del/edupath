/**
 * /privacy — Privacy Policy
 *
 * Substantive policy covering: data we collect, why we collect it, legal
 * basis (GDPR Art. 6 + Jordan PPL No. 24 of 2023), retention, sharing,
 * user rights, contact for DPO inquiries.
 *
 * Styled as a long-form prose page with a sticky table of contents on
 * desktop. Bilingual via next-intl; the legal text itself is stored in
 * messages/{en,ar}.json under the "Legal" namespace.
 */
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How EduPath collects, uses, and protects your personal data.',
  robots: { index: true, follow: true },
}

export default async function PrivacyPage() {
  const t = await getTranslations('Legal.privacy')

  const sections = [
    { id: 'collect', title: t('sections.collect.title'), body: t('sections.collect.body') },
    { id: 'use', title: t('sections.use.title'), body: t('sections.use.body') },
    { id: 'legal', title: t('sections.legal.title'), body: t('sections.legal.body') },
    { id: 'cookies', title: t('sections.cookies.title'), body: t('sections.cookies.body') },
    { id: 'share', title: t('sections.share.title'), body: t('sections.share.body') },
    { id: 'retention', title: t('sections.retention.title'), body: t('sections.retention.body') },
    { id: 'rights', title: t('sections.rights.title'), body: t('sections.rights.body') },
    { id: 'transfer', title: t('sections.transfer.title'), body: t('sections.transfer.body') },
    { id: 'security', title: t('sections.security.title'), body: t('sections.security.body') },
    { id: 'children', title: t('sections.children.title'), body: t('sections.children.body') },
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

      <div className="hidden md:block sticky top-4 float-right w-56 ml-8 mb-8">
        <nav className="text-xs text-muted-foreground space-y-1 border-l pl-4">
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`} className="block hover:text-foreground">
              {s.title}
            </a>
          ))}
        </nav>
      </div>

      <div className="space-y-8">
        {sections.map(s => (
          <section key={s.id} id={s.id} className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3">{s.title}</h2>
            <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t text-sm text-muted-foreground">
        <p>{t('footer.contact')}: <a href="mailto:privacy@edupath.com" className="text-blue-600 hover:underline">privacy@edupath.com</a></p>
      </div>
    </div>
  )
}
