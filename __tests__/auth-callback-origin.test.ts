import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveOrigin } from '../app/auth/callback/route'

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers })
}

describe('resolveOrigin', () => {
  beforeEach(() => { vi.unstubAllEnvs() })
  afterEach(() => { vi.unstubAllEnvs() })

  it('prefers NEXT_PUBLIC_SITE_URL when set', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://sttmountain.onrender.com')
    const req = makeRequest('http://localhost:10000/auth/callback')
    expect(resolveOrigin(req)).toBe('https://sttmountain.onrender.com')
  })

  it('strips trailing slash from NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://sttmountain.onrender.com/')
    const req = makeRequest('http://localhost:10000/auth/callback')
    expect(resolveOrigin(req)).toBe('https://sttmountain.onrender.com')
  })

  it('uses x-forwarded-host when env var not set', () => {
    const req = makeRequest('http://localhost:10000/auth/callback', {
      'x-forwarded-host': 'sttmountain.onrender.com',
      'x-forwarded-proto': 'https',
    })
    expect(resolveOrigin(req)).toBe('https://sttmountain.onrender.com')
  })

  it('falls back to host header when x-forwarded-host absent', () => {
    const req = makeRequest('http://localhost:10000/auth/callback', {
      'host': 'sttmountain.onrender.com',
      'x-forwarded-proto': 'https',
    })
    expect(resolveOrigin(req)).toBe('https://sttmountain.onrender.com')
  })

  it('defaults proto to https when x-forwarded-proto absent', () => {
    const req = makeRequest('http://localhost:10000/auth/callback', {
      'x-forwarded-host': 'sttmountain.onrender.com',
    })
    expect(resolveOrigin(req)).toBe('https://sttmountain.onrender.com')
  })

  it('falls back to url.origin for local dev (no forwarded headers)', () => {
    const req = makeRequest('http://localhost:3000/auth/callback')
    expect(resolveOrigin(req)).toBe('http://localhost:3000')
  })
})
