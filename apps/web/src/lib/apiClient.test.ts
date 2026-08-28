import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, requestJson } from './apiClient'
import { useSessionStore } from './stores/session.store'

describe('apiClient', () => {
  beforeEach(() => { useSessionStore.setState({ user: { id: 'u1', name: 'User', email: 'u@example.com' }, status: 'authenticated', isAuthenticated: true }); window.history.pushState({}, '', '/login'); vi.restoreAllMocks() })
  it('returns JSON for successful responses', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))); await expect(requestJson<{ ok: boolean }>('/api/test')).resolves.toEqual({ ok: true }) })
  it.each([400, 404, 409, 502, 503])('returns non-401 failures without clearing session (%s)', async (status) => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status }))); await expect(requestJson('/api/test')).rejects.toMatchObject({ status }); expect(useSessionStore.getState().status).toBe('authenticated') })
  it('clears session only for a 401 response', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))); await expect(requestJson('/api/test')).rejects.toBeInstanceOf(ApiError); expect(useSessionStore.getState()).toMatchObject({ status: 'unauthenticated', user: null }) })
  it('classifies network failure without turning it into logout', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline'))); await expect(requestJson('/api/test')).rejects.toMatchObject({ status: 0 }); expect(useSessionStore.getState().status).toBe('authenticated') })
})
