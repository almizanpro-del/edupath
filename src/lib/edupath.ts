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
  { code: 'United Kingdom', name: 'United Kingdom', nameAr: 'المملكة المتحدة', flag: '🇬🇧' },
  { code: 'Germany', name: 'Germany', nameAr: 'ألمانيا', flag: '🇩🇪' },
  { code: 'Turkey', name: 'Turkey', nameAr: 'تركيا', flag: '🇹🇷' },
  { code: 'Poland', name: 'Poland', nameAr: 'بولندا', flag: '🇵🇱' },
  { code: 'Lithuania', name: 'Lithuania', nameAr: 'ليتوانيا', flag: '🇱🇹' },
  { code: 'Malaysia', name: 'Malaysia', nameAr: 'ماليزيا', flag: '🇲🇾' },
  { code: 'Egypt', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬' },
  { code: 'Jordan', name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴' },
  { code: 'United Arab Emirates', name: 'United Arab Emirates', nameAr: 'الإمارات', flag: '🇦🇪' },
  { code: 'Lebanon', name: 'Lebanon', nameAr: 'لبنان', flag: '🇱🇧' },
]

export const FIELDS_OF_STUDY = [
  'Computer Science',
  'Engineering',
  'Business',
  'Medicine',
  'Social Sciences',
] as const

export const DEGREE_LEVELS = ['bachelor', 'master', 'phd'] as const

export const LANGUAGES = ['English', 'Arabic', 'German', 'Turkish'] as const

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
 * Get country flag emoji.
 */
export function countryFlag(countryName: string): string {
  return COUNTRIES.find(c => c.name === countryName)?.flag ?? '🌍'
}
