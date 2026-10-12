/**
 * Data trust/provenance utilities.
 *
 * Provides functions for displaying data verification status to users,
 * ensuring transparency about which data is officially verified vs
 * estimated vs unverified.
 */

export type VerifiedStatus =
  | 'UNVERIFIED'
  | 'OFFICIAL_SOURCE_VERIFIED'
  | 'THIRD_PARTY_CORROBORATED'
  | 'ESTIMATED'
  | 'STALE'
  | 'CONFLICTING_SOURCES'

export type TrustLevel = 'verified' | 'corroborated' | 'estimated' | 'unverified' | 'stale'

/**
 * Convert a verifiedStatus string to a TrustLevel for display.
 */
export function getTrustLevel(status?: string): TrustLevel {
  switch (status) {
    case 'OFFICIAL_SOURCE_VERIFIED':
      return 'verified'
    case 'THIRD_PARTY_CORROBORATED':
      return 'corroborated'
    case 'ESTIMATED':
      return 'estimated'
    case 'STALE':
      return 'stale'
    case 'CONFLICTING_SOURCES':
      return 'unverified'
    default:
      return 'unverified'
  }
}

/**
 * Get a human-readable label for the trust level.
 */
export function getTrustLabel(level: TrustLevel, locale: string = 'en'): string {
  const labels: Record<TrustLevel, { en: string; ar: string }> = {
    verified: { en: 'Officially Verified', ar: 'موثق رسمياً' },
    corroborated: { en: 'Cross-Referenced', ar: 'متقاطع المصادر' },
    estimated: { en: 'Estimated', ar: 'تقديري' },
    unverified: { en: 'Unverified', ar: 'غير موثق' },
    stale: { en: 'May Be Outdated', ar: 'قد يكون قديماً' },
  }
  return labels[level][locale === 'ar' ? 'ar' : 'en']
}

/**
 * Get the color classes for a trust level badge.
 */
export function getTrustColor(level: TrustLevel): string {
  switch (level) {
    case 'verified':
      return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300'
    case 'corroborated':
      return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300'
    case 'estimated':
      return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300'
    case 'stale':
      return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
  }
}

/**
 * Get a tooltip/description for the trust level.
 */
export function getTrustDescription(level: TrustLevel, locale: string = 'en'): string {
  const descriptions: Record<TrustLevel, { en: string; ar: string }> = {
    verified: {
      en: 'This data was verified against an official university source.',
      ar: 'تم التحقق من هذه البيانات مقابل مصدر جامعي رسمي.',
    },
    corroborated: {
      en: 'This data was cross-referenced with multiple sources.',
      ar: 'تم التحقق من هذه البيانات من مصادر متعددة.',
    },
    estimated: {
      en: 'This is an estimate based on available information. Verify with the university.',
      ar: 'هذا تقدير بناءً على المعلومات المتاحة. تحقق من الجامعة.',
    },
    unverified: {
      en: 'This data has not been independently verified. Confirm with the university.',
      ar: 'لم يتم التحقق من هذه البيانات بشكل مستقل. أكد مع الجامعة.',
    },
    stale: {
      en: 'This data may be outdated. Verify current details with the university.',
      ar: 'قد تكون هذه البيانات قديمة. تحقق من التفاصيل الحالية مع الجامعة.',
    },
  }
  return descriptions[level][locale === 'ar' ? 'ar' : 'en']
}

/**
 * Calculate a simple data quality score (0-100) for a university record.
 * Used when the dataQualityScore field is 0 (not yet calculated).
 */
export function calculateDataQualityScore(uni: {
  tuitionUsd: number
  livingCostUsd: number
  descriptionEn: string | null
  descriptionAr: string | null
  programs: unknown[]
  acceptanceRate: number | null
  intlStudentPct: number
  website: string
  logoUrl: string | null
}): number {
  let score = 0
  if (uni.tuitionUsd > 0) score += 20
  if (uni.livingCostUsd > 0) score += 15
  if (uni.descriptionEn && uni.descriptionEn.length >= 50) score += 15
  if (uni.descriptionAr && uni.descriptionAr.length >= 50) score += 10
  if (uni.programs.length > 0) score += 15
  if (uni.acceptanceRate !== null) score += 5
  if (uni.intlStudentPct > 0) score += 5
  if (uni.website && uni.website.startsWith('http')) score += 10
  if (uni.logoUrl) score += 5
  return Math.min(score, 100)
}
