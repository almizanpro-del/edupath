/**
 * Multi-currency display utilities with FX snapshot.
 *
 * Rates are approximate and updated periodically via /api/cron/refresh-fx.
 * In production, replace with daily-refreshed rates from exchangerate.host
 * or similar service. The CRON_SECRET env var must be set to enable the
 * refresh endpoint.
 *
 * Supports 9 currencies: USD, EUR, GBP, JOD, AED, EGP, SAR, TRY, MYR.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JOD' | 'AED' | 'EGP' | 'SAR' | 'TRY' | 'MYR'

/**
 * FX rate snapshot — 1 USD = X local currency.
 * Timestamp tracks when the rates were last updated.
 */
export const FX_SNAPSHOT = {
  timestamp: new Date('2026-09-20T00:00:00Z'),
  rates: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JOD: 0.709,
    AED: 3.673,
    EGP: 48.5,
    SAR: 3.75,
    TRY: 34.0,
    MYR: 4.45,
  } as Record<CurrencyCode, number>,
}

// Backwards-compatible export for existing code
export const EXCHANGE_RATES: Record<CurrencyCode, number> = FX_SNAPSHOT.rates

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JOD: 'JOD ',
  AED: 'AED ',
  EGP: 'EGP ',
  SAR: 'SAR ',
  TRY: '₺',
  MYR: 'RM ',
}

export const CURRENCIES: Array<{ code: CurrencyCode; name: string; flag: string }> = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JOD', name: 'Jordanian Dinar', flag: '🇯🇴' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
]

/**
 * Convert USD amount to a target currency and format with symbol.
 */
export function convertAndFormat(usdAmount: number, target: CurrencyCode): string {
  const converted = Math.round(usdAmount * FX_SNAPSHOT.rates[target])
  const symbol = CURRENCY_SYMBOLS[target]
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

/**
 * Convert USD to a target currency (raw number, no formatting).
 */
export function convertUsdTo(amountUsd: number, target: CurrencyCode): number {
  const rate = FX_SNAPSHOT.rates[target] ?? 1.0
  return Math.round(amountUsd * rate * 100) / 100
}

/**
 * Convert from a source currency back to USD.
 */
export function convertToUsd(amount: number, source: CurrencyCode): number {
  const rate = FX_SNAPSHOT.rates[source] ?? 1.0
  return Math.round((amount / rate) * 100) / 100
}

/**
 * Check if the FX snapshot is outdated (older than 7 days).
 */
export function isOutdatedSnapshot(): boolean {
  const now = new Date()
  const diffMs = now.getTime() - FX_SNAPSHOT.timestamp.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > 7
}

/**
 * Get a human-readable age of the FX snapshot.
 */
export function getSnapshotAge(): string {
  const now = new Date()
  const diffMs = now.getTime() - FX_SNAPSHOT.timestamp.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
}
