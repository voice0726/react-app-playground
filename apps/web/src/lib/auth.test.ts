import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSession, parseGatewayUser, shouldRedirectToLogin } from './auth'

describe('session contract', () => {
  beforeEach(() => vi.restoreAllMocks())
  it('parses the gateway user into the UI user shape', () => { expect(parseGatewayUser({ user_id: 'u1', name: 'User', email: 'u@example.com', roles: [] })).toEqual({ id: 'u1', name: 'User', email: 'u@example.com' }) })
  it('rejects an incomplete gateway user', () => { expect(parseGatewayUser({ name: 'User', email: 'u@example.com' })).toBeNull() })
  it('redirects only unauthenticated routes to login', () => { expect(shouldRedirectToLogin('unauthenticated')).toBe(true); expect(shouldRedirectToLogin('unavailable')).toBe(false); expect(shouldRedirectToLogin('authenticated')).toBe(false); expect(shouldRedirectToLogin('loading')).toBe(false) })
  it.each([{ status: 401, body: {} }, { status: 503, body: {} }, { status: 200, body: { invalid: true } }])('classifies response $status', async ({ status, body }) => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))); const result = await fetchSession('/auth/me', 50); expect(result.status).toBe(status === 401 ? 'unauthenticated' : 'unavailable') })
  it('classifies network and timeout as unavailable', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network'))); expect((await fetchSession('/auth/me', 50)).status).toBe('unavailable'); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'))); const result = await fetchSession('/auth/me', 50); expect(result).toMatchObject({ status: 'unavailable', reason: 'timeout' }) })
  it('uses an AbortController timeout', async () => { vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))) }))); expect(await fetchSession('/auth/me', 1)).toEqual({ status: 'unavailable', reason: 'timeout' }) })
})
