import { SELF } from 'cloudflare:test'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

describe('Worker runtime', () => {
  it('複数のSet-Cookieを維持して認証応答を返す', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(() => {
      const headers = new Headers()
      headers.append('Set-Cookie', 'login_state=state; Path=/; HttpOnly; Secure')
      headers.append('Set-Cookie', 'session_react-app-playground=session; Path=/; HttpOnly; Secure')
      return Promise.resolve(new Response('ok', { headers }))
    }))

    const response = await SELF.fetch('https://react-app-playground.aknr.dev/auth/callback')

    expect(response.headers.getSetCookie()).toEqual([
      'login_state=state; Path=/; HttpOnly; Secure',
      'session_react-app-playground=session; Path=/; HttpOnly; Secure',
    ])
  })
})
