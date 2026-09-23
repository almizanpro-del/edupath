/**
 * GET /api/agent/debug
 * Temporary debug endpoint to check if ZAI env vars are set.
 * REMOVE THIS FILE AFTER DEBUGGING.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ZAI_BASE_URL: process.env.ZAI_BASE_URL ? 'SET' : 'NOT SET',
    ZAI_API_KEY: process.env.ZAI_API_KEY ? 'SET' : 'NOT SET',
    ZAI_CHAT_ID: process.env.ZAI_CHAT_ID ? 'SET' : 'NOT SET',
    ZAI_TOKEN: process.env.ZAI_TOKEN ? 'SET (length: ' + process.env.ZAI_TOKEN.length + ')' : 'NOT SET',
    ZAI_USER_ID: process.env.ZAI_USER_ID ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    cwd: process.cwd(),
  })
}
