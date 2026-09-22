import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import arMessages from '../../messages/ar.json'

/**
 * Recursively collect all leaf-key paths from a nested object.
 * e.g. { Hero: { title: "..." } } → ["Hero.title"]
 */
function getKeyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getKeyPaths(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

describe('i18n Messages', () => {
  it('should have matching keys in both languages', () => {
    const enKeys = getKeyPaths(enMessages).sort()
    const arKeys = getKeyPaths(arMessages).sort()
    expect(arKeys).toEqual(enKeys)
  })

  it('should not have empty string translations', () => {
    const enEmpty: string[] = []
    const arEmpty: string[] = []

    function checkEmpty(obj: Record<string, unknown>, lang: string, path: string, emptyArr: string[]) {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = path ? `${path}.${key}` : key
        if (typeof value === 'string' && value.trim() === '') {
          emptyArr.push(`${lang}: ${fullKey}`)
        } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          checkEmpty(value as Record<string, unknown>, lang, fullKey, emptyArr)
        }
      }
    }

    checkEmpty(enMessages, 'en', '', enEmpty)
    checkEmpty(arMessages, 'ar', '', arEmpty)

    expect(enEmpty).toEqual([])
    expect(arEmpty).toEqual([])
  })

  it('should have both locales with substantial content', () => {
    const enKeyCount = getKeyPaths(enMessages).length
    const arKeyCount = getKeyPaths(arMessages).length
    expect(enKeyCount).toBeGreaterThan(100)
    expect(arKeyCount).toBeGreaterThan(100)
    expect(enKeyCount).toBe(arKeyCount)
  })
})
