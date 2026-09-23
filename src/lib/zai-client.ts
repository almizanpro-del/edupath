/**
 * ZAI SDK wrapper with environment variable fallback.
 *
 * The z-ai-web-dev-sdk reads config from a .z-ai-config file. This works
 * in the dev sandbox (config at /etc/.z-ai-config) but fails on Vercel
 * unless the .z-ai-config file exists.
 *
 * The prebuild script in package.json creates .z-ai-config from ZAI_*
 * environment variables. This wrapper just calls ZAI.create() which
 * reads that file.
 *
 * If ZAI.create() fails, we throw a clear error message.
 */

import ZAI from 'z-ai-web-dev-sdk'

type ZAIInstance = Awaited<ReturnType<typeof ZAI.create>>

let cachedClient: ZAIInstance | null = null

/**
 * Get a ZAI client. Reads from .z-ai-config file (created by prebuild
 * script from ZAI_* environment variables).
 */
export async function getZaiClient(): Promise<ZAIInstance> {
  if (cachedClient) return cachedClient

  try {
    cachedClient = await ZAI.create()
    return cachedClient
  } catch (err) {
    throw new Error(
      `ZAI SDK configuration not found. The .z-ai-config file is missing or invalid. ` +
      `On Vercel, ensure ZAI_BASE_URL, ZAI_API_KEY, ZAI_TOKEN, and ZAI_USER_ID ` +
      `environment variables are set. Original error: ${err instanceof Error ? err.message : err}`
    )
  }
}
