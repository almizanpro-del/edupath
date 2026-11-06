/**
 * GET /api/agent/debug
 * Temporary debug endpoint — tests different ZAI API URLs.
 * REMOVE THIS FILE AFTER DEBUGGING.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const results: { envVars: Record<string, string>; tests: Record<string, unknown> } = {
    envVars: {
      ZAI_BASE_URL: process.env.ZAI_BASE_URL || 'NOT SET',
      ZAI_API_KEY: process.env.ZAI_API_KEY ? 'SET' : 'NOT SET',
      ZAI_TOKEN: process.env.ZAI_TOKEN ? `SET (${process.env.ZAI_TOKEN.length} chars)` : 'NOT SET',
    },
    tests: {},
  }

  // Test different base URLs
  const urlsToTest = [
    'https://api.z.ai/v1',
    'https://internal-api.z.ai/v1',
    'https://open.bigmodel.cn/api/paas/v4',
  ]

  for (const baseUrl of urlsToTest) {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ZAIClass = ZAI as any
      const config = {
        baseUrl,
        apiKey: process.env.ZAI_API_KEY || 'Z.ai',
        chatId: process.env.ZAI_CHAT_ID || '',
        token: process.env.ZAI_TOKEN || '',
        userId: process.env.ZAI_USER_ID || '',
      }
      const client = new ZAIClass(config)
      const completion = await client.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Say hello.' },
          { role: 'user', content: 'hi' },
        ],
        thinking: { type: 'disabled' },
      })
      results.tests[baseUrl] = {
        success: true,
        response: completion.choices[0]?.message?.content?.slice(0, 50) || 'EMPTY',
      }
    } catch (err) {
      results.tests[baseUrl] = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  return NextResponse.json(results)
}
