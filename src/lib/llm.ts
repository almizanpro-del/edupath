/**
 * Unified LLM client with multi-provider fallback.
 *
 * Tries providers in this order:
 *   1. ZAI SDK (sandbox config — works in dev)
 *   2. OpenAI API (if OPENAI_API_KEY is set)
 *   3. Grok / xAI API (if XAI_API_KEY is set)
 *   4. ZAI SDK (env vars — last resort)
 *
 * All providers expose the same interface:
 *   chatCompletion(messages, options) → { content: string }
 *
 * Usage:
 *   import { chatCompletion } from '@/lib/llm'
 *   const result = await chatCompletion([
 *     { role: 'assistant', content: 'You are helpful.' },
 *     { role: 'user', content: 'Say hello' },
 *   ])
 *   console.log(result.content) // "Hello!"
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatCompletionResult = {
  content: string
  provider: string
}

export type ChatOptions = {
  temperature?: number
  maxTokens?: number
  model?: string
  thinkingDisabled?: boolean
}

// ---- Provider implementations ----

async function tryZaiSandbox(messages: ChatMessage[], opts: ChatOptions): Promise<ChatCompletionResult> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: opts.thinkingDisabled !== false ? 'disabled' : 'enabled' },
  })
  const content = completion.choices[0]?.message?.content || ''
  if (!content) throw new Error('ZAI returned empty response')
  return { content, provider: 'zai-sandbox' }
}

async function tryOpenAI(messages: ChatMessage[], opts: ChatOptions): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const model = opts.model || process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const body: Record<string, unknown> = {
    model,
    messages,
  }
  if (opts.temperature !== undefined) body.temperature = opts.temperature
  if (opts.maxTokens !== undefined) body.max_tokens = opts.maxTokens

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  if (!content) throw new Error('OpenAI returned empty response')
  return { content, provider: 'openai' }
}

async function tryGrok(messages: ChatMessage[], opts: ChatOptions): Promise<ChatCompletionResult> {
  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY
  if (!apiKey) throw new Error('XAI_API_KEY not set')

  const model = opts.model || process.env.XAI_MODEL || 'grok-beta'
  const body: Record<string, unknown> = {
    model,
    messages,
  }
  if (opts.temperature !== undefined) body.temperature = opts.temperature
  if (opts.maxTokens !== undefined) body.max_tokens = opts.maxTokens

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Grok API error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  if (!content) throw new Error('Grok returned empty response')
  return { content, provider: 'grok' }
}

async function tryZaiEnv(messages: ChatMessage[], opts: ChatOptions): Promise<ChatCompletionResult> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const config = {
    baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai/api/v1',
    apiKey: process.env.ZAI_API_KEY || 'Z.ai',
    chatId: process.env.ZAI_CHAT_ID || '',
    token: process.env.ZAI_TOKEN || '',
    userId: process.env.ZAI_USER_ID || '',
  }
  if (!config.token) throw new Error('ZAI_TOKEN not set')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ZAIClass = ZAI as any
  const client = new ZAIClass(config)
  const completion = await client.chat.completions.create({
    messages,
    thinking: { type: opts.thinkingDisabled !== false ? 'disabled' : 'enabled' },
  })
  const content = completion.choices[0]?.message?.content || ''
  if (!content) throw new Error('ZAI (env) returned empty response')
  return { content, provider: 'zai-env' }
}

// ---- Public API ----

/**
 * Send a chat completion request. Tries providers in order until one works.
 *
 * Order:
 *   1. ZAI sandbox (dev only)
 *   2. OpenAI (if OPENAI_API_KEY set)
 *   3. Grok (if XAI_API_KEY set)
 *   4. ZAI env (last resort)
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<ChatCompletionResult> {
  const errors: string[] = []

  // 1. ZAI sandbox (works in dev — config at /etc/.z-ai-config)
  try {
    return await tryZaiSandbox(messages, opts)
  } catch (err) {
    errors.push(`ZAI-sandbox: ${err instanceof Error ? err.message : err}`)
  }

  // 2. OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      return await tryOpenAI(messages, opts)
    } catch (err) {
      errors.push(`OpenAI: ${err instanceof Error ? err.message : err}`)
    }
  }

  // 3. Grok / xAI
  if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) {
    try {
      return await tryGrok(messages, opts)
    } catch (err) {
      errors.push(`Grok: ${err instanceof Error ? err.message : err}`)
    }
  }

  // 4. ZAI env (last resort — public API with env token)
  if (process.env.ZAI_TOKEN) {
    try {
      return await tryZaiEnv(messages, opts)
    } catch (err) {
      errors.push(`ZAI-env: ${err instanceof Error ? err.message : err}`)
    }
  }

  // All providers failed
  throw new Error(
    `All LLM providers failed:\n${errors.join('\n')}\n` +
    `Set OPENAI_API_KEY or XAI_API_KEY on Vercel to enable AI features.`
  )
}

/**
 * Check which LLM providers are configured.
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = []
  // ZAI sandbox is always tried first (works in dev)
  providers.push('zai-sandbox (dev)')
  if (process.env.OPENAI_API_KEY) providers.push('openai')
  if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) providers.push('grok')
  if (process.env.ZAI_TOKEN) providers.push('zai-env')
  return providers
}
