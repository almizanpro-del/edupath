/**
 * GET /api/agent/debug
 * Temporary debug endpoint — raw fetch tests to ZAI API.
 * REMOVE THIS FILE AFTER DEBUGGING.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const tests: Record<string, unknown> = {}
  const token = process.env.ZAI_TOKEN || ''
  const apiKey = process.env.ZAI_API_KEY || 'Z.ai'

  // Test 1: Raw fetch to api.z.ai/api/v1/chat/completions with token as Bearer
  try {
    const res = await fetch('https://api.z.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Say hello' }],
        thinking: { type: 'disabled' },
      }),
    })
    const text = await res.text()
    tests['api.z.ai/api/v1 (token as Bearer)'] = {
      status: res.status,
      body: text.slice(0, 500),
    }
  } catch (err) {
    tests['api.z.ai/api/v1 (token as Bearer)'] = { error: String(err) }
  }

  // Test 2: Raw fetch with apiKey as Bearer
  try {
    const res = await fetch('https://api.z.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Token': token,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Say hello' }],
        thinking: { type: 'disabled' },
      }),
    })
    const text = await res.text()
    tests['api.z.ai/api/v1 (apiKey + X-Token)'] = {
      status: res.status,
      body: text.slice(0, 500),
    }
  } catch (err) {
    tests['api.z.ai/api/v1 (apiKey + X-Token)'] = { error: String(err) }
  }

  // Test 3: api.z.ai/api/paas/v4 with token
  try {
    const res = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: 'Say hello' }],
      }),
    })
    const text = await res.text()
    tests['api.z.ai/api/paas/v4 (token)'] = {
      status: res.status,
      body: text.slice(0, 500),
    }
  } catch (err) {
    tests['api.z.ai/api/paas/v4 (token)'] = { error: String(err) }
  }

  return NextResponse.json({ tests })
}
