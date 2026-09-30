import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from './session.store'

describe('session store', () => {
  beforeEach(() => useSessionStore.setState({ user: null, status: 'loading', isAuthenticated: false }))
  it.each(['loading', 'unauthenticated', 'unavailable'] as const)('stores %s without authentication', (status) => { useSessionStore.getState().setStatus(status); expect(useSessionStore.getState()).toMatchObject({ status, isAuthenticated: false, user: null }) })
  it('stores authenticated user', () => { useSessionStore.getState().setSession({ id: 'u1', name: 'User', email: 'u@example.com' }); expect(useSessionStore.getState()).toMatchObject({ status: 'authenticated', isAuthenticated: true, user: { id: 'u1' } }) })
  it('clears user on logout or expiry', () => { useSessionStore.getState().setSession({ id: 'u1', name: 'User', email: 'u@example.com' }); useSessionStore.getState().clearSession(); expect(useSessionStore.getState()).toMatchObject({ status: 'unauthenticated', isAuthenticated: false, user: null }) })
})
