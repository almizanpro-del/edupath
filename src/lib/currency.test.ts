import { describe, it, expect } from 'vitest'
import {
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
  CURRENCIES,
  convertAndFormat,
  formatWithSecondary,
  type CurrencyCode,
} from './currency'

describe('Currency Conversion', () => {
  it('should have USD rate as 1.0', () => {
    expect(EXCHANGE_RATES.USD).toBe(1)
  })

  it('should have all currencies with rates', () => {
    const expectedCurrencies: CurrencyCode[] = ['USD', 'JOD', 'AED', 'EGP', 'SAR', 'EUR', 'TRY', 'MYR']
    for (const code of expectedCurrencies) {
      expect(EXCHANGE_RATES[code]).toBeDefined()
      expect(EXCHANGE_RATES[code]).toBeGreaterThan(0)
    }
  })

  it('should have matching symbols for all currencies', () => {
    for (const code of Object.keys(EXCHANGE_RATES) as CurrencyCode[]) {
      expect(CURRENCY_SYMBOLS[code]).toBeDefined()
      expect(typeof CURRENCY_SYMBOLS[code]).toBe('string')
    }
  })

  it('should convert USD to USD correctly', () => {
    const result = convertAndFormat(1000, 'USD')
    expect(result).toContain('1,000')
  })

  it('should convert USD to JOD correctly', () => {
    const result = convertAndFormat(1000, 'JOD')
    // 1000 * 0.709 = 709
    expect(result).toContain('709')
  })

  it('should convert USD to EUR correctly', () => {
    const result = convertAndFormat(1000, 'EUR')
    // 1000 * 0.92 = 920
    expect(result).toContain('920')
  })

  it('should handle zero amounts', () => {
    const result = convertAndFormat(0, 'JOD')
    expect(result).toContain('0')
  })

  it('should format with secondary currency', () => {
    const result = formatWithSecondary(1000, 'JOD')
    expect(result).toContain('$1,000')
    expect(result).toContain('JOD')
  })

  it('should return USD only when no secondary currency', () => {
    const result = formatWithSecondary(1000)
    expect(result).toBe('$1,000')
  })

  it('should return USD only when secondary is USD', () => {
    const result = formatWithSecondary(1000, 'USD')
    expect(result).toBe('$1,000')
  })

  it('should have all currencies in the CURRENCIES array', () => {
    const codes = CURRENCIES.map(c => c.code)
    expect(codes).toContain('USD')
    expect(codes).toContain('JOD')
    expect(codes).toContain('EUR')
    expect(CURRENCIES.length).toBeGreaterThanOrEqual(8)
  })

  it('should have flags for all currencies', () => {
    for (const c of CURRENCIES) {
      expect(c.flag).toBeTruthy()
      expect(c.name).toBeTruthy()
    }
  })
})
