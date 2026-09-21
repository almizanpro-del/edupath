import { describe, it, expect } from 'vitest'
import {
  formatUsd,
  formatUsdCompact,
  totalCost,
  parseTags,
  similarity,
  countryCode,
  countryFlagUrl,
  COUNTRIES,
  FIELDS_OF_STUDY,
  DEGREE_LEVELS,
  LANGUAGES,
} from './edupath'

describe('formatUsd', () => {
  it('should format 0 correctly', () => {
    expect(formatUsd(0)).toBe('$0')
  })

  it('should format thousands with comma', () => {
    expect(formatUsd(5000)).toBe('$5,000')
  })

  it('should format large numbers', () => {
    expect(formatUsd(25000)).toBe('$25,000')
  })

  it('should format decimals (rounds to integer)', () => {
    const result = formatUsd(99.99)
    expect(result).toBe('$100')
  })
})

describe('formatUsdCompact', () => {
  it('should format thousands as K', () => {
    expect(formatUsdCompact(6000)).toBe('$6K')
  })

  it('should format 0 correctly', () => {
    expect(formatUsdCompact(0)).toBe('$0')
  })

  it('should format large amounts', () => {
    expect(formatUsdCompact(25000)).toBe('$25K')
  })
})

describe('totalCost', () => {
  it('should calculate tuition-only cost', () => {
    // tuition 5000/yr, 0 living, 12 months = 1 year
    expect(totalCost(5000, 0, 12)).toBe(5000)
  })

  it('should calculate tuition + living', () => {
    // tuition 5000/yr, living 6000/yr, 12 months = 11000
    expect(totalCost(5000, 6000, 12)).toBe(11000)
  })

  it('should scale with duration', () => {
    // 2 years: tuition 10000 + living 12000 = 22000
    expect(totalCost(5000, 6000, 24)).toBe(22000)
  })

  it('should handle 0 tuition', () => {
    expect(totalCost(0, 6000, 12)).toBe(6000)
  })

  it('should handle 0 duration', () => {
    expect(totalCost(5000, 6000, 0)).toBe(0)
  })
})

describe('parseTags', () => {
  it('should parse valid JSON array', () => {
    expect(parseTags('["affordable","good"]')).toEqual(['affordable', 'good'])
  })

  it('should return empty array for null', () => {
    expect(parseTags(null)).toEqual([])
  })

  it('should return empty array for undefined', () => {
    expect(parseTags(undefined)).toEqual([])
  })

  it('should return empty array for invalid JSON', () => {
    expect(parseTags('not json')).toEqual([])
  })

  it('should return empty array for empty string', () => {
    expect(parseTags('')).toEqual([])
  })
})

describe('similarity', () => {
  it('should return 1 for identical strings', () => {
    expect(similarity('hello', 'hello')).toBe(1)
  })

  it('should return 0 for completely different strings', () => {
    expect(similarity('abc', 'xyz')).toBe(0)
  })

  it('should return partial similarity', () => {
    const result = similarity('Oxford', 'Oxford Brookes')
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1)
  })

  it('should be case insensitive', () => {
    expect(similarity('Hello', 'hello')).toBe(1)
  })
})

describe('countryCode', () => {
  it('should return code for known country', () => {
    expect(countryCode('Jordan')).toBeTruthy()
  })

  it('should return code for Turkey', () => {
    expect(countryCode('Turkey')).toBeTruthy()
  })

  it('should return null for unknown country', () => {
    expect(countryCode('Unknown Country')).toBeNull()
  })
})

describe('countryFlagUrl', () => {
  it('should return a URL for known country', () => {
    const url = countryFlagUrl('Jordan')
    expect(url).toContain('flagcdn.com')
    expect(url).toContain('.png')
  })

  it('should include width parameter', () => {
    const url = countryFlagUrl('Jordan', 120)
    expect(url).toContain('120')
  })
})

describe('constants', () => {
  it('should have COUNTRIES array with entries', () => {
    expect(COUNTRIES.length).toBeGreaterThan(0)
    for (const c of COUNTRIES) {
      expect(c.code).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.flag).toBeTruthy()
    }
  })

  it('should have FIELDS_OF_STUDY array', () => {
    expect(FIELDS_OF_STUDY.length).toBeGreaterThan(0)
    expect(FIELDS_OF_STUDY).toContain('Computer Science')
  })

  it('should have DEGREE_LEVELS', () => {
    expect(DEGREE_LEVELS).toContain('bachelor')
    expect(DEGREE_LEVELS).toContain('master')
    expect(DEGREE_LEVELS).toContain('phd')
  })

  it('should have LANGUAGES', () => {
    expect(LANGUAGES).toContain('English')
    expect(LANGUAGES).toContain('Arabic')
  })
})
