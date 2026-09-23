/**
 * GET /api/agent/debug
 * Temporary debug endpoint — tests multiple ZAI API URLs.
 * REMOVE THIS FILE AFTER DEBUGGING.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const tests: Record<string, unknown> = {}

  const urlsToTest = [
    'https://api.z.ai/api/v1',
    'https://api.z.ai/api/paas/v4',
    'https://open.bigmodel.cn/api/paas/v4',
    'https://api.z.ai',
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
      tests[baseUrl] = {
        success: true,
        response: completion.choices[0]?.message?.content?.slice(0, 50) || 'EMPTY',
      }
    } catch (err) {
      tests[baseUrl] = {
        success: false,
        error: err instanceof Error ? err.message.slice(0, 200) : String(err),
      }
    }
  }

  return NextResponse.json({ tests })
}
