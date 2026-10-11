import { describe, it, expect } from 'vitest'
import { rateLimit } from './rate-limit'
import { NextRequest } from 'next/server'

function createMockRequest(ip: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    headers: {
      'x-forwarded-for': ip,
    },
  })
}

describe('rateLimit', () => {
  it('allows requests under the limit', () => {
    const req = createMockRequest('1.2.3.4')
    const result = rateLimit(req, { windowMs: 60_000, max: 5 })
    expect(result).toBeNull()
  })

  it('blocks requests over the limit', () => {
    const ip = '5.6.7.8'
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest(ip)
      rateLimit(req, { windowMs: 60_000, max: 5 })
    }
    const req = createMockRequest(ip)
    const result = rateLimit(req, { windowMs: 60_000, max: 5 })
    expect(result).not.toBeNull()
    expect(result?.status).toBe(429)
  })

  it('tracks different IPs separately', () => {
    const req1 = createMockRequest('1.1.1.1')
    const req2 = createMockRequest('2.2.2.2')
    rateLimit(req1, { windowMs: 60_000, max: 1 })
    const result = rateLimit(req2, { windowMs: 60_000, max: 1 })
    expect(result).toBeNull()
  })
})
