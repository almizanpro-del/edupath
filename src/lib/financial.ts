/**
 * Financial data utilities for transparent tuition/cost handling.
 *
 * Key principles:
 *   - Never present unverified data as factual
 *   - Never silently convert missing tuition to zero
 *   - Always disclose uncertainty
 *   - Distinguish verified, estimated, and unverified figures
 */

import type { VerifiedStatus, TrustLevel } from './data-trust'
import { getTrustLevel } from './data-trust'

export type TuitionData = {
  tuitionUsd: number | null | undefined
  livingCostUsd: number | null | undefined
  verifiedStatus?: string
}

export type TuitionDisplay = {
  /** Formatted tuition string, or null if unknown */
  tuitionLabel: string | null
  /** Whether this is a verified, estimated, or unverified figure */
  trustLevel: TrustLevel
  /** Short badge text for UI */
  badgeText: string
  /** Whether the value should be shown with a warning style */
  isWarning: boolean
}

// Tuition values that are known seed-data defaults (not researched)
const KNOWN_DEFAULTS = new Set([5000, 3500, 4500, 2500, 3000, 4000, 1500])

/**
 * Evaluate tuition data for display. Returns display metadata
 * that the UI uses to show verified vs estimated vs unverified figures.
 *
 * Rules:
 *   - If verifiedStatus is OFFICIAL_SOURCE_VERIFIED → show as verified
 *   - If tuition is in KNOWN_DEFAULTS set → show as "Estimated"
 *   - If tuition is 0 or null → show as "Unknown" (not $0)
 *   - Otherwise → show as "Unverified"
 */
export function evaluateTuition(data: TuitionData, locale: string = 'en'): TuitionDisplay {
  const trustLevel = getTrustLevel(data.verifiedStatus)
  const isAr = locale === 'ar'

  // Verified data
  if (trustLevel === 'verified') {
    return {
      tuitionLabel: data.tuitionUsd ? `$${data.tuitionUsd.toLocaleString()}/yr` : null,
      trustLevel: 'verified',
      badgeText: isAr ? 'موثق' : 'Verified',
      isWarning: false,
    }
  }

  // Missing tuition
  if (!data.tuitionUsd || data.tuitionUsd === 0) {
    return {
      tuitionLabel: null, // UI should show "Unknown" instead of $0
      trustLevel: 'unverified',
      badgeText: isAr ? 'غير معروف' : 'Unknown',
      isWarning: true,
    }
  }

  // Known seed-data default — treat as estimate
  if (KNOWN_DEFAULTS.has(data.tuitionUsd)) {
    return {
      tuitionLabel: `~$${data.tuitionUsd.toLocaleString()}/yr`,
      trustLevel: 'estimated',
      badgeText: isAr ? 'تقديري' : 'Estimated',
      isWarning: true,
    }
  }

  // Has a value but not verified
  return {
    tuitionLabel: `$${data.tuitionUsd.toLocaleString()}/yr`,
    trustLevel: 'unverified',
    badgeText: isAr ? 'غير موثق' : 'Unverified',
    isWarning: true,
  }
}

/**
 * Safely calculate total cost. Returns null if critical data is missing.
 * Never returns 0 for missing tuition — returns null instead.
 */
export function calculateTotalCost(
  tuitionUsd: number | null | undefined,
  livingCostUsd: number | null | undefined,
  durationMonths: number,
  includeLiving: boolean = true
): number | null {
  // Tuition is required — if missing, can't calculate
  if (!tuitionUsd || tuitionUsd <= 0) return null

  const years = durationMonths / 12
  let total = tuitionUsd * years

  if (includeLiving && livingCostUsd && livingCostUsd > 0) {
    total += livingCostUsd * years
  }

  return Math.round(total)
}

/**
 * Generate a data quality report for universities.
 * Returns a list of issues found per university.
 */
export function auditUniversityData(universities: Array<{
  name: string
  country: string
  tuitionUsd: number
  livingCostUsd: number
  programs: Array<{ tuitionUsd?: number; deadline?: string | null; entryReqs?: string | null }>
  descriptionAr?: string | null
  verifiedStatus?: string
}>): {
  totalIssues: number
  byType: Record<string, number>
  universities: Array<{ name: string; country: string; issues: string[] }>
} {
  const byType: Record<string, number> = {}
  const results: Array<{ name: string; country: string; issues: string[] }> = []

  for (const uni of universities) {
    const issues: string[] = []

    if (KNOWN_DEFAULTS.has(uni.tuitionUsd)) {
      issues.push('DEFAULT_TUITION')
      byType['DEFAULT_TUITION'] = (byType['DEFAULT_TUITION'] || 0) + 1
    }

    if (!uni.tuitionUsd || uni.tuitionUsd === 0) {
      issues.push('MISSING_TUITION')
      byType['MISSING_TUITION'] = (byType['MISSING_TUITION'] || 0) + 1
    }

    if (!uni.livingCostUsd || uni.livingCostUsd === 0) {
      issues.push('MISSING_LIVING_COST')
      byType['MISSING_LIVING_COST'] = (byType['MISSING_LIVING_COST'] || 0) + 1
    }

    if (!uni.descriptionAr || uni.descriptionAr.trim().length === 0) {
      issues.push('MISSING_ARABIC_DESC')
      byType['MISSING_ARABIC_DESC'] = (byType['MISSING_ARABIC_DESC'] || 0) + 1
    }

    if (!uni.verifiedStatus || uni.verifiedStatus === 'UNVERIFIED') {
      issues.push('UNVERIFIED')
      byType['UNVERIFIED'] = (byType['UNVERIFIED'] || 0) + 1
    }

    const programsNoDeadline = uni.programs.filter(p => !p.deadline).length
    if (programsNoDeadline > 0) {
      issues.push(`MISSING_DEADLINES (${programsNoDeadline}/${uni.programs.length})`)
      byType['MISSING_DEADLINES'] = (byType['MISSING_DEADLINES'] || 0) + 1
    }

    const programsNoEntryReqs = uni.programs.filter(p => !p.entryReqs).length
    if (programsNoEntryReqs === uni.programs.length && uni.programs.length > 0) {
      issues.push('NO_ENTRY_REQUIREMENTS')
      byType['NO_ENTRY_REQUIREMENTS'] = (byType['NO_ENTRY_REQUIREMENTS'] || 0) + 1
    }

    if (issues.length > 0) {
      results.push({ name: uni.name, country: uni.country, issues })
    }
  }

  return {
    totalIssues: Object.values(byType).reduce((a, b) => a + b, 0),
    byType,
    universities: results,
  }
}
