/**
 * ZAI SDK wrapper — constructs client from environment variables.
 *
 * IMPORTANT: On Vercel, the internal-api.z.ai URL is NOT reachable.
 * The public API is at https://api.z.ai/api/v1 — but it requires a
 * valid Z.ai API key (not the sandbox JWT token).
 *
 * To get a Z.ai API key:
 *   1. Go to https://open.bigmodel.cn/ (Z.ai developer portal)
 *   2. Sign up and create an API key
 *   3. Set it as ZAI_TOKEN on Vercel
 *
 * For local dev, the sandbox config at /etc/.z-ai-config works fine.
 */

import ZAI from 'z-ai-web-dev-sdk'

type ZAIInstance = Awaited<ReturnType<typeof ZAI.create>>

let cachedClient: ZAIInstance | null = null

export async function getZaiClient(): Promise<ZAIInstance> {
  if (cachedClient) return cachedClient

  // Try sandbox config first (works in dev)
  try {
    cachedClient = await ZAI.create()
    return cachedClient
  } catch {
    // No sandbox config — use env vars (Vercel)
  }

  // Construct from env vars
  const config = {
    // Public API URL (internal-api.z.ai doesn't work on Vercel)
    baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai/api/v1',
    apiKey: process.env.ZAI_API_KEY || 'Z.ai',
    chatId: process.env.ZAI_CHAT_ID || '',
    token: process.env.ZAI_TOKEN || '',
    userId: process.env.ZAI_USER_ID || '',
  }

  if (!config.token) {
    throw new Error(
      'ZAI_TOKEN not set. Get a valid API key from https://open.bigmodel.cn/ ' +
      'and set it as ZAI_TOKEN on Vercel.'
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ZAIClass = ZAI as any
  cachedClient = new ZAIClass(config) as ZAIInstance
  return cachedClient
}
