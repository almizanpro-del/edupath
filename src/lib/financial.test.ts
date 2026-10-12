import { describe, it, expect } from 'vitest'
import {
  evaluateTuition,
  calculateTotalCost,
  auditUniversityData,
} from './financial'

describe('evaluateTuition', () => {
  it('returns verified status for verified data', () => {
    const result = evaluateTuition({ tuitionUsd: 8000, verifiedStatus: 'OFFICIAL_SOURCE_VERIFIED' })
    expect(result.trustLevel).toBe('verified')
    expect(result.isWarning).toBe(false)
    expect(result.tuitionLabel).toContain('8,000')
  })

  it('returns estimated for known default tuition ($5000)', () => {
    const result = evaluateTuition({ tuitionUsd: 5000, verifiedStatus: 'UNVERIFIED' })
    expect(result.trustLevel).toBe('estimated')
    expect(result.isWarning).toBe(true)
    expect(result.tuitionLabel).toContain('~')
  })

  it('returns unknown for zero tuition', () => {
    const result = evaluateTuition({ tuitionUsd: 0, verifiedStatus: 'UNVERIFIED' })
    expect(result.tuitionLabel).toBeNull()
    expect(result.badgeText).toBe('Unknown')
    expect(result.isWarning).toBe(true)
  })

  it('returns unknown for null tuition', () => {
    const result = evaluateTuition({ tuitionUsd: null, verifiedStatus: 'UNVERIFIED' })
    expect(result.tuitionLabel).toBeNull()
  })

  it('returns unknown for undefined tuition', () => {
    const result = evaluateTuition({ tuitionUsd: undefined, verifiedStatus: 'UNVERIFIED' })
    expect(result.tuitionLabel).toBeNull()
  })

  it('returns unverified for non-default tuition without verification', () => {
    const result = evaluateTuition({ tuitionUsd: 12000, verifiedStatus: 'UNVERIFIED' })
    expect(result.trustLevel).toBe('unverified')
    expect(result.isWarning).toBe(true)
  })

  it('returns Arabic labels when locale is ar', () => {
    const result = evaluateTuition({ tuitionUsd: 0, verifiedStatus: 'UNVERIFIED' }, 'ar')
    expect(result.badgeText).toBe('غير معروف')
  })
})

describe('calculateTotalCost', () => {
  it('calculates total with tuition + living', () => {
    expect(calculateTotalCost(5000, 6000, 12, true)).toBe(11000)
  })

  it('calculates total with tuition only', () => {
    expect(calculateTotalCost(5000, 6000, 12, false)).toBe(5000)
  })

  it('scales with duration', () => {
    expect(calculateTotalCost(5000, 6000, 24, true)).toBe(22000)
  })

  it('returns null for zero tuition (not 0)', () => {
    expect(calculateTotalCost(0, 6000, 12, true)).toBeNull()
  })

  it('returns null for null tuition (not 0)', () => {
    expect(calculateTotalCost(null, 6000, 12, true)).toBeNull()
  })

  it('returns null for undefined tuition', () => {
    expect(calculateTotalCost(undefined, 6000, 12, true)).toBeNull()
  })

  it('handles zero duration', () => {
    expect(calculateTotalCost(5000, 6000, 0, true)).toBe(0)
  })

  it('handles missing living cost gracefully', () => {
    expect(calculateTotalCost(5000, 0, 12, true)).toBe(5000)
    expect(calculateTotalCost(5000, null, 12, true)).toBe(5000)
  })
})

describe('auditUniversityData', () => {
  const sampleUniversities = [
    {
      name: 'Test University A',
      country: 'Jordan',
      tuitionUsd: 5000, // known default
      livingCostUsd: 6000,
      programs: [{ tuitionUsd: 5000, deadline: null, entryReqs: null }],
      descriptionAr: '',
      verifiedStatus: 'UNVERIFIED',
    },
    {
      name: 'Test University B',
      country: 'Turkey',
      tuitionUsd: 8000, // not a default
      livingCostUsd: 5000,
      programs: [{ tuitionUsd: 8000, deadline: '2026-06-01', entryReqs: 'High school diploma' }],
      descriptionAr: 'وصف عربي',
      verifiedStatus: 'OFFICIAL_SOURCE_VERIFIED',
    },
    {
      name: 'Test University C',
      country: 'Egypt',
      tuitionUsd: 0, // missing
      livingCostUsd: 0, // missing
      programs: [],
      descriptionAr: null,
      verifiedStatus: 'UNVERIFIED',
    },
  ]

  it('identifies default tuition values', () => {
    const report = auditUniversityData(sampleUniversities)
    const uniA = report.universities.find(u => u.name === 'Test University A')
    expect(uniA?.issues).toContain('DEFAULT_TUITION')
  })

  it('identifies missing tuition', () => {
    const report = auditUniversityData(sampleUniversities)
    const uniC = report.universities.find(u => u.name === 'Test University C')
    expect(uniC?.issues).toContain('MISSING_TUITION')
  })

  it('identifies missing Arabic descriptions', () => {
    const report = auditUniversityData(sampleUniversities)
    const uniA = report.universities.find(u => u.name === 'Test University A')
    expect(uniA?.issues).toContain('MISSING_ARABIC_DESC')
  })

  it('does not flag verified universities with no issues', () => {
    const report = auditUniversityData(sampleUniversities)
    const uniB = report.universities.find(u => u.name === 'Test University B')
    // B has verifiedStatus, non-default tuition, Arabic desc, deadline, entry reqs
    // But it might still have UNVERIFIED flag? No — it's OFFICIAL_SOURCE_VERIFIED
    expect(uniB).toBeUndefined() // no issues
  })

  it('counts total issues correctly', () => {
    const report = auditUniversityData(sampleUniversities)
    expect(report.totalIssues).toBeGreaterThan(0)
    expect(report.byType['DEFAULT_TUITION']).toBeGreaterThan(0)
    expect(report.byType['MISSING_TUITION']).toBe(1)
  })
})
