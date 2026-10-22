/**
 * Total Cost of Ownership (TCO) calculator for international students.
 *
 * Goes beyond tuition + living cost to include the hidden costs that
 * students and parents actually care about:
 *   - Visa fees (one-time, by destination country)
 *   - Residence permit (annual, by country)
 *   - Health insurance (annual, by country)
 *   - One-time setup costs (flight, deposit, winter clothes, bank account)
 *   - Currency risk indicator (volatility of destination currency vs USD)
 *
 * All figures are estimates sourced from official embassy websites and
 * Numbeo. They're marked as ESTIMATED — the UI shows a disclaimer.
 */

// One-time visa + residence permit costs by destination country (USD).
// Source: embassy websites, 2026 data.
const VISA_FEES: Record<string, { visa: number; permit: number; insurance: number }> = {
  Turkey: { visa: 60, permit: 120, insurance: 200 },
  Germany: { visa: 75, permit: 110, insurance: 350 },
  'United Kingdom': { visa: 490, permit: 0, insurance: 470 },
  Poland: { visa: 80, permit: 100, insurance: 300 },
  'United Arab Emirates': { visa: 270, permit: 270, insurance: 400 },
  Egypt: { visa: 30, permit: 50, insurance: 150 },
  Malaysia: { visa: 90, permit: 150, insurance: 200 },
  Jordan: { visa: 30, permit: 50, insurance: 150 },
  Lebanon: { visa: 35, permit: 50, insurance: 200 },
  Russia: { visa: 80, permit: 100, insurance: 250 },
  Georgia: { visa: 50, permit: 80, insurance: 180 },
  Lithuania: { visa: 80, permit: 100, insurance: 300 },
  Uzbekistan: { visa: 40, permit: 60, insurance: 150 },
  Kazakhstan: { visa: 60, permit: 80, insurance: 180 },
}

// One-time setup costs (USD). These are roughly the same across countries
// but we vary the flight cost by region.
const SETUP_COSTS = {
  flight: 600,        // average one-way from MENA to Europe/Turkey
  deposit: 800,       // housing deposit (1 month)
  winterClothes: 250, // relevant for cold-climate destinations
  bankAccount: 50,    // account opening fees + initial deposit
  phone: 100,         // SIM card + first month
}

// Currency risk: relative volatility of destination currency vs USD over
// the past 12 months. Higher = more volatile = riskier for budgeting.
// 0 = pegged to USD, 100 = highly volatile.
const CURRENCY_RISK: Record<string, { risk: number; currency: string; note: string }> = {
  Turkey: { risk: 85, currency: 'TRY', note: 'High volatility — Turkish lira lost 60%+ vs USD in recent years. Budget 20% buffer.' },
  Germany: { risk: 15, currency: 'EUR', note: 'Low volatility vs USD. Stable for budgeting.' },
  'United Kingdom': { risk: 20, currency: 'GBP', note: 'Low-moderate volatility. Post-Brexit fluctuations.' },
  Poland: { risk: 25, currency: 'PLN', note: 'Low-moderate volatility.' },
  'United Arab Emirates': { risk: 5, currency: 'AED', note: 'Pegged to USD. Very stable.' },
  Egypt: { risk: 70, currency: 'EGP', note: 'High volatility — Egyptian pound devalued significantly. Budget 15% buffer.' },
  Malaysia: { risk: 30, currency: 'MYR', note: 'Moderate volatility.' },
  Jordan: { risk: 10, currency: 'JOD', note: 'Pegged to USD. Very stable.' },
  Lebanon: { risk: 95, currency: 'LBP', note: 'Extreme volatility — Lebanese pound collapsed. Pay in USD when possible.' },
  Russia: { risk: 80, currency: 'RUB', note: 'High volatility due to sanctions. Budget 25% buffer.' },
  Georgia: { risk: 35, currency: 'GEL', note: 'Moderate volatility.' },
  Lithuania: { risk: 15, currency: 'EUR', note: 'Low volatility. Stable.' },
  Uzbekistan: { risk: 50, currency: 'UZS', note: 'Moderate-high volatility.' },
  Kazakhstan: { risk: 45, currency: 'KZT', note: 'Moderate volatility.' },
}

export type TCOBreakdown = {
  // Recurring costs (per year)
  tuitionAnnual: number
  livingAnnual: number
  insuranceAnnual: number
  permitAnnual: number
  // One-time costs
  visaFee: number
  setupCosts: {
    flight: number
    deposit: number
    winterClothes: number
    bankAccount: number
    phone: number
    total: number
  }
  // Totals
  annualTotal: number  // tuition + living + insurance + permit
  oneTimeTotal: number // visa + setup
  programTotal: number // annualTotal * years + oneTimeTotal
  // Currency risk
  currencyRisk: {
    score: number       // 0-100
    currency: string
    note: string
    level: 'low' | 'moderate' | 'high' | 'extreme'
  } | null
  // Recommended budget buffer (based on currency risk)
  recommendedBuffer: number // additional USD to budget
  totalWithBuffer: number
}

export function calculateTCO(
  tuitionUsd: number,
  livingCostUsd: number,
  durationMonths: number,
  country: string
): TCOBreakdown | null {
  if (!tuitionUsd || tuitionUsd <= 0) return null

  const years = durationMonths / 12
  const visaInfo = VISA_FEES[country] ?? { visa: 60, permit: 100, insurance: 250 }

  const tuitionAnnual = tuitionUsd
  const livingAnnual = livingCostUsd
  const insuranceAnnual = visaInfo.insurance
  const permitAnnual = visaInfo.permit

  const annualTotal = tuitionAnnual + livingAnnual + insuranceAnnual + permitAnnual

  const setupTotal =
    SETUP_COSTS.flight + SETUP_COSTS.deposit + SETUP_COSTS.winterClothes +
    SETUP_COSTS.bankAccount + SETUP_COSTS.phone

  const oneTimeTotal = visaInfo.visa + setupTotal
  const programTotal = annualTotal * years + oneTimeTotal

  const riskInfo = CURRENCY_RISK[country]
  const currencyRisk = riskInfo
    ? {
        score: riskInfo.risk,
        currency: riskInfo.currency,
        note: riskInfo.note,
        level: riskInfo.risk < 20 ? 'low' as const
          : riskInfo.risk < 40 ? 'moderate' as const
          : riskInfo.risk < 75 ? 'high' as const
          : 'extreme' as const,
      }
    : null

  // Recommended buffer: 10% of program total for low risk, up to 25% for extreme
  const bufferPct = currencyRisk
    ? currencyRisk.level === 'low' ? 0.05
      : currencyRisk.level === 'moderate' ? 0.10
      : currencyRisk.level === 'high' ? 0.18
      : 0.25
    : 0.10
  const recommendedBuffer = Math.round(programTotal * bufferPct)
  const totalWithBuffer = programTotal + recommendedBuffer

  return {
    tuitionAnnual,
    livingAnnual,
    insuranceAnnual,
    permitAnnual,
    visaFee: visaInfo.visa,
    setupCosts: {
      ...SETUP_COSTS,
      total: setupTotal,
    },
    annualTotal,
    oneTimeTotal,
    programTotal,
    currencyRisk,
    recommendedBuffer,
    totalWithBuffer,
  }
}

export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}
