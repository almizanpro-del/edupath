/**
 * ZAI SDK wrapper with runtime config file creation.
 *
 * The z-ai-web-dev-sdk reads config from a .z-ai-config file. This file
 * exists in the dev sandbox but NOT on Vercel's serverless runtime.
 *
 * This wrapper creates the config file at RUNTIME from ZAI_* environment
 * variables, then calls ZAI.create() which reads it.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'

type ZAIInstance = Awaited<ReturnType<typeof ZAI.create>>

let cachedClient: ZAIInstance | null = null
let configWritten = false

/**
 * Ensure the .z-ai-config file exists. If it doesn't, create it from
 * ZAI_* environment variables.
 */
function ensureConfigFile() {
  if (configWritten) return

  // Check common locations
  const paths = [
    join(process.cwd(), '.z-ai-config'),
    '/tmp/.z-ai-config',
  ]

  // If any path already has a valid config, we're good
  for (const p of paths) {
    if (existsSync(p)) {
      configWritten = true
      return
    }
  }

  // Create from env vars — write to /tmp (always writable on Vercel)
  // and also to cwd (works in dev)
  const config = {
    baseUrl: process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
    apiKey: process.env.ZAI_API_KEY || 'Z.ai',
    chatId: process.env.ZAI_CHAT_ID || '',
    token: process.env.ZAI_TOKEN || '',
    userId: process.env.ZAI_USER_ID || '',
  }

  // Only write if we have the essential fields
  if (!config.token) {
    throw new Error('ZAI_TOKEN environment variable is not set')
  }

  const configStr = JSON.stringify(config)

  // Write to /tmp (Vercel serverless writable directory)
  try {
    writeFileSync('/tmp/.z-ai-config', configStr)
  } catch {
    // /tmp not writable — try cwd
  }

  // Also write to cwd (dev environment)
  try {
    writeFileSync(join(process.cwd(), '.z-ai-config'), configStr)
  } catch {
    // cwd not writable — /tmp should work
  }

  configWritten = true
}

/**
 * Get a ZAI client. Creates .z-ai-config from env vars if needed.
 */
export async function getZaiClient(): Promise<ZAIInstance> {
  if (cachedClient) return cachedClient

  ensureConfigFile()

  try {
    cachedClient = await ZAI.create()
    return cachedClient
  } catch (err) {
    throw new Error(
      `ZAI SDK failed to initialize. Ensure ZAI_TOKEN, ZAI_BASE_URL, ` +
      `ZAI_API_KEY, ZAI_CHAT_ID, ZAI_USER_ID env vars are set. ` +
      `Error: ${err instanceof Error ? err.message : err}`
    )
  }
}
