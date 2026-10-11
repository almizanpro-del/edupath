/**
 * Input sanitization utilities.
 *
 * IMPORTANT: React automatically escapes text rendered in JSX ({variable}).
 * So we do NOT HTML-escape user input before storing it in the database.
 * Doing so causes double-escaping (users see &#x27; instead of ').
 *
 * These functions focus on:
 *   - Stripping dangerous HTML tags/scripts (defense-in-depth)
 *   - Validating email/URL formats
 *   - Truncating to safe lengths
 *
 * XSS prevention is handled by React at render time.
 * Only use HTML escaping if rendering with dangerouslySetInnerHTML
 * (which we don't do with user-generated content).
 */

/**
 * Strip script tags and event handlers from user input.
 * Does NOT HTML-escape — React handles that at render time.
 * Use for any user-generated text before storing in the database.
 */
export function sanitizeText(input: string): string {
  if (!input) return ''
  return input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick=, onerror=, etc.)
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove iframe/embed/object tags
    .replace(/<\/?(iframe|embed|object|script)\b[^>]*>/gi, '')
    // Trim whitespace
    .trim()
}

/**
 * Sanitize text but preserve basic line breaks.
 * Returns the text with \n preserved (React can render with whitespace-pre-wrap).
 */
export function sanitizeTextWithBreaks(input: string): string {
  return sanitizeText(input)
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


