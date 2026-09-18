import { getRequestConfig } from 'next-intl/server'
import { headers, cookies } from 'next/headers'

export const locales = ['en', 'ar'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export default getRequestConfig(async () => {
  // Try cookie first, then accept-language header
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('locale')?.value as Locale | undefined

  let locale: Locale = defaultLocale
  if (cookieLocale && locales.includes(cookieLocale)) {
    locale = cookieLocale
  } else {
    // Fall back to Accept-Language header
    const headerStore = await headers()
    const acceptLang = headerStore.get('accept-language') ?? ''
    if (acceptLang.startsWith('ar')) {
      locale = 'ar'
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
