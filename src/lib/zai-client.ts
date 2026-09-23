/**
 * ZAI SDK wrapper that bypasses the file-based config system.
 *
 * The z-ai-web-dev-sdk normally reads config from a .z-ai-config file.
 * This doesn't work on Vercel because the file system is read-only.
 *
 * This wrapper constructs the ZAI client directly from environment variables,
 * bypassing the file-based config entirely.
 */

import ZAI from 'z-ai-web-dev-sdk'

type ZAIInstance = Awaited<ReturnType<typeof ZAI.create>>

let cachedClient: ZAIInstance | null = null

/**
 * Get a ZAI client constructed directly from ZAI_* environment variables.
 * No .z-ai-config file needed.
 */
export async function getZaiClient(): Promise<ZAIInstance> {
  if (cachedClient) return cachedClient

  const config = {
    baseUrl: process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
    apiKey: process.env.ZAI_API_KEY || 'Z.ai',
    chatId: process.env.ZAI_CHAT_ID || '',
    token: process.env.ZAI_TOKEN || '',
    userId: process.env.ZAI_USER_ID || '',
  }

  if (!config.token) {
    throw new Error(
      'ZAI_TOKEN environment variable is not set. ' +
      'Set ZAI_BASE_URL, ZAI_API_KEY, ZAI_CHAT_ID, ZAI_TOKEN, ZAI_USER_ID on Vercel.'
    )
  }

  // Construct directly — bypasses the file-based loadConfig()
  // The ZAI constructor accepts a config object with these fields.
  // TypeScript marks the constructor as private, but it works at runtime
  // (confirmed by testing). We use @ts-expect-error to bypass the check.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ZAIClass = ZAI as any
  cachedClient = new ZAIClass(config) as ZAIInstance
  return cachedClient
}
