/**
 * GET /api/agent/debug
 * Temporary debug endpoint to check ZAI SDK initialization.
 * REMOVE THIS FILE AFTER DEBUGGING.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const envStatus = {
    ZAI_BASE_URL: process.env.ZAI_BASE_URL ? 'SET' : 'NOT SET',
    ZAI_API_KEY: process.env.ZAI_API_KEY ? 'SET' : 'NOT SET',
    ZAI_CHAT_ID: process.env.ZAI_CHAT_ID ? 'SET' : 'NOT SET',
    ZAI_TOKEN: process.env.ZAI_TOKEN ? `SET (length: ${process.env.ZAI_TOKEN.length})` : 'NOT SET',
    ZAI_USER_ID: process.env.ZAI_USER_ID ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    cwd: process.cwd(),
  }

  // Try constructing ZAI client directly
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ZAIClass = ZAI as any
    const config = {
      baseUrl: process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
      apiKey: process.env.ZAI_API_KEY || 'Z.ai',
      chatId: process.env.ZAI_CHAT_ID || '',
      token: process.env.ZAI_TOKEN || '',
      userId: process.env.ZAI_USER_ID || '',
    }
    const client = new ZAIClass(config)

    // Try a simple chat completion
    const completion = await client.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in one word.' },
      ],
      thinking: { type: 'disabled' },
    })

    return NextResponse.json({
      ...envStatus,
      zaiClientCreated: true,
      llmResponse: completion.choices[0]?.message?.content || 'EMPTY',
      success: true,
    })
  } catch (err) {
    return NextResponse.json({
      ...envStatus,
      zaiClientCreated: false,
      error: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : undefined,
      success: false,
    })
  }
}
