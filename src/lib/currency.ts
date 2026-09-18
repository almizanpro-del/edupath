/**
 * Multi-currency display utilities.
 * Converts USD to local currencies using fixed approximate rates.
 * In production, replace with daily-refreshed rates from exchangerate.host.
 */

export type CurrencyCode = 'USD' | 'JOD' | 'AED' | 'EGP' | 'SAR' | 'EUR' | 'TRY' | 'MYR'

// Approximate rates as of Sep 2026 (1 USD = X local currency)
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  JOD: 0.709,
  AED: 3.673,
  EGP: 48.5,
  SAR: 3.75,
  EUR: 0.92,
  TRY: 34.0,
  MYR: 4.45,
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  JOD: 'JOD ',
  AED: 'AED ',
  EGP: 'EGP ',
  SAR: 'SAR ',
  EUR: '€',
  TRY: '₺',
  MYR: 'RM ',
}

export const CURRENCIES: Array<{ code: CurrencyCode; name: string; flag: string }> = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'JOD', name: 'Jordanian Dinar', flag: '🇯🇴' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
]

/**
 * Convert USD amount to a target currency and format with symbol.
 */
export function convertAndFormat(usdAmount: number, target: CurrencyCode): string {
  const converted = Math.round(usdAmount * EXCHANGE_RATES[target])
  const symbol = CURRENCY_SYMBOLS[target]
  if (target === 'USD' || target === 'EUR') {
    return `${symbol}${converted.toLocaleString()}`
  }
  return `${symbol}${converted.toLocaleString()}`
}

/**
 * Format USD amount with option to show secondary currency.
 */
export function formatWithSecondary(usdAmount: number, secondary?: CurrencyCode): string {
  const usd = `$${usdAmount.toLocaleString()}`
  if (!secondary || secondary === 'USD') return usd
  return `${usd} (${convertAndFormat(usdAmount, secondary)})`
}
