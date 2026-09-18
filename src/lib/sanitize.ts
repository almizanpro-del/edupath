/**
 * Input sanitization utilities.
 * Prevents XSS by stripping HTML tags and dangerous characters from user input.
 * Used for: review text, lead messages, university descriptions, names.
 */

/**
 * Strip all HTML tags from a string. Escapes < > & " ' characters.
 * Use for any user-generated text that will be rendered in the browser.
 */
export function sanitizeText(input: string): string {
  if (!input) return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize text but preserve basic line breaks.
 * Converts \n to <br> for display, after sanitizing.
 */
export function sanitizeTextWithBreaks(input: string): string {
  return sanitizeText(input).replace(/\n/g, '<br>')
}

/**
 * Validate and sanitize an email address.
 * Returns null if invalid.
 */
export function sanitizeEmail(email: string): string | null {
  const cleaned = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(cleaned)) return null
  return cleaned
}

/**
 * Sanitize a URL — only allow http/https protocols.
 * Returns empty string for invalid URLs.
 */
export function sanitizeUrl(url: string): string {
  const cleaned = url.trim()
  if (/^https?:\/\//i.test(cleaned)) return cleaned
  return ''
}

/**
 * Truncate text to a maximum length, adding ellipsis if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Validate that a string contains no script tags or event handlers.
 * Returns true if safe.
 */
export function isSafeInput(input: string): boolean {
  const lower = input.toLowerCase()
  const dangerous = ['<script', 'javascript:', 'onerror=', 'onload=', 'onclick=', 'onmouseover=', '<iframe', '<embed', '<object']
  return !dangerous.some(d => lower.includes(d))
}
