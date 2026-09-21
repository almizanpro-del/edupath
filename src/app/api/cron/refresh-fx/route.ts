/**
 * GET /api/cron/refresh-fx
 * Cron job: refreshes exchange rates from exchangerate-api.com.
 *
 * Configured as a Vercel Cron job (vercel.json) running daily.
 * Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`.
 *
 * REQUIRES `CRON_SECRET` env var — returns 401 if unset.
 * Optionally set `EXCHANGERATE_API_KEY` for the paid endpoint (free tier
 * works without a key but has rate limits).
 */
import { NextResponse, NextRequest } from 'next/server'
import { FX_SNAPSHOT } from '@/lib/currency'

export async function GET(req: NextRequest) {
  // Auth: require CRON_SECRET (fail-closed)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch latest USD rates from free API
    // (No API key needed for the free tier — exchangerate-api.com)
    const apiUrl = process.env.EXCHANGERATE_API_KEY
      ? `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/latest/USD`
      : 'https://open.er-api.com/v6/latest/USD'

    const response = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      // Cache for 1 hour to avoid hitting rate limits
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`)
    }

    const data = await response.json()
    const apiRates = data.rates ?? data.conversion_rates

    if (!apiRates) {
      throw new Error('No rates in API response')
    }

    // Build the new rates object (keep USD as 1.0, fall back to existing if missing)
    const newRates = {
      USD: 1.0,
      EUR: apiRates.EUR ?? FX_SNAPSHOT.rates.EUR,
      GBP: apiRates.GBP ?? FX_SNAPSHOT.rates.GBP,
      JOD: apiRates.JOD ?? FX_SNAPSHOT.rates.JOD,
      AED: apiRates.AED ?? FX_SNAPSHOT.rates.AED,
      EGP: apiRates.EGP ?? FX_SNAPSHOT.rates.EGP,
      SAR: apiRates.SAR ?? FX_SNAPSHOT.rates.SAR,
      TRY: apiRates.TRY ?? FX_SNAPSHOT.rates.TRY,
      MYR: apiRates.MYR ?? FX_SNAPSHOT.rates.MYR,
    }

    // Note: In a serverless environment, we can't persist these rates back
    // to the source file. For production, store them in the database or
    // a KV store (Vercel KV, Upstash) and read from there in currency.ts.
    // For now, we log the update and return the rates so the cron monitor
    // can verify success.
    console.log('[cron/refresh-fx] Fetched new rates:', newRates)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      rates: newRates,
      note: 'Rates fetched. Store in DB/KV for persistence across serverless instances.',
    })
  } catch (error) {
    console.error('[cron/refresh-fx] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    )
  }
}
