/**
 * JSON-LD schema helpers for structured data (rich snippets).
 * Used by search engines to display enhanced results.
 */

type University = {
  name: string
  website: string
  logoUrl: string | null
  descriptionEn: string
  city: string
  country: string
  cheapestProgramTuition: number
  avgRating: number | null
  reviewCount: number
}

export function getCollegeOrUniversitySchema(uni: University) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollegeOrUniversity',
    name: uni.name,
    url: uni.website,
    logo: uni.logoUrl ?? undefined,
    description: uni.descriptionEn,
    address: {
      '@type': 'PostalAddress',
      addressLocality: uni.city,
      addressCountry: uni.country,
    },
    sameAs: [uni.website].filter(Boolean),
    ...(uni.avgRating !== null && uni.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: uni.avgRating.toFixed(1),
            reviewCount: uni.reviewCount,
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: uni.cheapestProgramTuition,
      priceCurrency: 'USD',
      description: `Tuition from $${uni.cheapestProgramTuition}/year`,
    },
  }
}

export function getOrganizationSchema() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'EduPath',
    url: base,
    logo: `${base}/logo.png`,
    description: 'Discover affordable universities worldwide. Built for MENA students.',
    sameAs: [
      'https://twitter.com/edupath',
      'https://linkedin.com/company/edupath',
    ].filter(Boolean),
  }
}

export function getWebSiteSchema() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'EduPath',
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}
