/**
 * EduPath shared types and helpers.
 */
import { db } from '@/lib/db'

export type Country = {
  code: string
  name: string
  nameAr: string
  flag: string
}

export const COUNTRIES: Country[] = [
  { code: 'United Kingdom', name: 'United Kingdom', nameAr: 'المملكة المتحدة', flag: 'gb' },
  { code: 'Germany', name: 'Germany', nameAr: 'ألمانيا', flag: 'de' },
  { code: 'Turkey', name: 'Turkey', nameAr: 'تركيا', flag: 'tr' },
  { code: 'Poland', name: 'Poland', nameAr: 'بولندا', flag: 'pl' },
  { code: 'Lithuania', name: 'Lithuania', nameAr: 'ليتوانيا', flag: 'lt' },
  { code: 'Malaysia', name: 'Malaysia', nameAr: 'ماليزيا', flag: 'my' },
  { code: 'Egypt', name: 'Egypt', nameAr: 'مصر', flag: 'eg' },
  { code: 'Jordan', name: 'Jordan', nameAr: 'الأردن', flag: 'jo' },
  { code: 'United Arab Emirates', name: 'United Arab Emirates', nameAr: 'الإمارات', flag: 'ae' },
  { code: 'Lebanon', name: 'Lebanon', nameAr: 'لبنان', flag: 'lb' },
  { code: 'Russia', name: 'Russia', nameAr: 'روسيا', flag: 'ru' },
  { code: 'Uzbekistan', name: 'Uzbekistan', nameAr: 'أوزبكستان', flag: 'uz' },
  { code: 'Kazakhstan', name: 'Kazakhstan', nameAr: 'كازاخستان', flag: 'kz' },
  { code: 'Georgia', name: 'Georgia', nameAr: 'جورجيا', flag: 'ge' },
]

export const FIELDS_OF_STUDY = [
  'Computer Science',
  'Engineering',
  'Business',
  'Medicine',
  'Social Sciences',
] as const

export const DEGREE_LEVELS = ['bachelor', 'master', 'phd'] as const

export const LANGUAGES = ['English', 'Arabic', 'German', 'Turkish', 'Russian'] as const

/**
 * Format USD amount with $ sign and thousands separator.
 */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format USD as compact (e.g. $15K, $1.2M).
 */
export function formatUsdCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

/**
 * Trigram similarity for fuzzy search (Levenshtein-based).
 * Returns 0-1 score.
 */
export function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim()
  const s2 = b.toLowerCase().trim()
  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0
  // Simple subsequence check + token overlap
  const tokens1 = new Set(s1.split(/\s+/))
  const tokens2 = new Set(s2.split(/\s+/))
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length
  const union = new Set([...tokens1, ...tokens2]).size
  return intersection / union
}

/**
 * Parse tags JSON string safely.
 */
export function parseTags(tagsJson: string | null | undefined): string[] {
  if (!tagsJson) return []
  try {
    const parsed = JSON.parse(tagsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Aggregate rating across multiple review dimensions.
 */
export function aggregateRating(r: {
  ratingOverall: number
  ratingAffordability: number
  ratingVisa: number
  ratingTeaching: number
  ratingSafety: number
  ratingSocial: number
}): number {
  // Weighted: overall + 5 sub-dimensions
  return (
    r.ratingOverall * 0.4 +
    (r.ratingAffordability + r.ratingTeaching) * 0.15 +
    (r.ratingVisa + r.ratingSafety + r.ratingSocial) * 0.1
  )
}

/**
 * Total cost for a degree program (tuition * years + living * years).
 */
export function totalCost(tuitionUsd: number, livingCostUsd: number, durationMonths: number): number {
  const years = durationMonths / 12
  return Math.round(tuitionUsd * years + livingCostUsd * years)
}

/**
 * Get ISO 3166-1 alpha-2 country code for a country name.
 * Returns null if country not found.
 */
export function countryCode(countryName: string): string | null {
  return COUNTRIES.find(c => c.name === countryName)?.flag ?? null
}

/**
 * Get country flag image URL from flagcdn.com.
 * Returns a URL like https://flagcdn.com/w80/gb.png
 * These render reliably on all platforms (unlike emoji flags which
 * don't render on Windows).
 */
export function countryFlagUrl(countryName: string, width = 80): string {
  const code = countryCode(countryName)
  if (!code) return ''
  return `https://flagcdn.com/w${width}/${code}.png`
}

/**
 * Get country flag emoji (legacy — use countryFlagUrl for reliable rendering).
 */
export function countryFlag(countryName: string): string {
  return COUNTRIES.find(c => c.name === countryName)?.flag ?? '🌍'
}
