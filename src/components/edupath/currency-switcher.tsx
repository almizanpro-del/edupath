'use client'

import * as React from 'react'
import { Coins, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CURRENCIES, type CurrencyCode, EXCHANGE_RATES,
  getSnapshotAge, isOutdatedSnapshot,
} from '@/lib/currency'

const STORAGE_KEY = 'edupath_currency'

export function CurrencySwitcher() {
  const [currency, setCurrency] = React.useState<CurrencyCode>('USD')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null
    if (stored && stored in EXCHANGE_RATES) {
      setCurrency(stored)
    }
  }, [])

  const change = (code: CurrencyCode) => {
    localStorage.setItem(STORAGE_KEY, code)
    setCurrency(code)
    // Reload to update all displayed prices
    window.location.reload()
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="gap-1">
        <Coins className="size-4" />
        <span className="text-xs">USD</span>
      </Button>
    )
  }

  const outdated = isOutdatedSnapshot()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Coins className="size-4" />
          <span className="text-xs font-semibold">{currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {CURRENCIES.map(c => (
          <DropdownMenuItem key={c.code} onClick={() => change(c.code)} className={currency === c.code ? 'font-bold' : ''}>
            {c.flag} {c.code} — {c.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
          {outdated ? (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="size-3" />
              Rates may be outdated ({getSnapshotAge()})
            </span>
          ) : (
            <span>Rates updated {getSnapshotAge()}</span>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Get the user's selected currency (for use in server components or on first render).
 */
export function getUserCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD'
  const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null
  return stored && stored in EXCHANGE_RATES ? stored : 'USD'
}
