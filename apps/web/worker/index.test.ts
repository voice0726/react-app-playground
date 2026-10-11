import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './index'

const origin = 'https://react-app-playground.aknr.dev'

afterEach(() => vi.unstubAllGlobals())

function setup(response = new Response('upstream')) {
  const upstreamFetch = vi.fn<typeof fetch>().mockResolvedValue(response)
  vi.stubGlobal('fetch', upstreamFetch)
  const assets = { fetch: vi.fn().mockResolvedValue(new Response('asset')) }
  return { upstreamFetch, assets }
}

const forwarded = async (headers: Record<string, string>, env: { AUTH_PROXY_TOKEN?: string }) => {
  const { upstreamFetch, assets } = setup()
  await worker.fetch(new Request(`${origin}/auth/login`, { headers }), { ASSETS: assets, ...env })
  return upstreamFetch.mock.calls[0]?.[0] as Request
}

describe('Worker の中継', () => {
  it.each(['evil-app', 'evil-app, other-app', undefined])(
    '認証のアプリIDを固定値で上書きする: %s',
    async (appId) => {
      const { upstreamFetch, assets } = setup()
      const headers = new Headers({ Cookie: 'session_react-app-playground=value' })
      if (appId) headers.set('x-app-id', appId)
      await worker.fetch(new Request(`${origin}/auth/me`, { headers }), { ASSETS: assets })
      const request = upstreamFetch.mock.calls[0]?.[0] as Request
      expect(request.headers.get('X-App-Id')).toBe('react-app-playground')
      expect(request.headers.get('Cookie')).toBe('session_react-app-playground=value')
      expect(assets.fetch).not.toHaveBeenCalled()
    },
  )

  it.each(['/auth/login?redirect=%2Fdashboard', '/auth/callback?code=a&state=b', '/auth']) (
    '認証のパスとクエリを維持する: %s',
    async (path) => {
      const { upstreamFetch, assets } = setup()
      await worker.fetch(new Request(`${origin}${path}`), { ASSETS: assets })
      const request = upstreamFetch.mock.calls[0]?.[0] as Request
      expect(request.url).toBe(`https://auth.aknr.dev${path}`)
      expect(request.redirect).toBe('manual')
    },
  )

  it('APIのメソッド・本文・Cookie・OriginとパスをCloud Runへ転送する', async () => {
    const { upstreamFetch, assets } = setup()
    await worker.fetch(new Request(`${origin}/api/customers?limit=10`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: 'session=value', Origin: origin },
      body: '{"name":"test"}',
    }), { ASSETS: assets })
    const request = upstreamFetch.mock.calls[0]?.[0] as Request
    expect(request.url).toBe('https://react-app-playground-backend-tqhoqdmw4a-uc.a.run.app/api/customers?limit=10')
    expect(request.method).toBe('POST')
    expect(await request.text()).toBe('{"name":"test"}')
    expect(request.headers.get('Content-Type')).toBe('application/json')
    expect(request.headers.get('Cookie')).toBe('session=value')
    expect(request.headers.get('Origin')).toBe(origin)
    expect(assets.fetch).not.toHaveBeenCalled()
  })

  it('認証のリダイレクト・Cookie・キャッシュ制御を変更せず返す', async () => {
    const response = new Response(null, {
      status: 302,
      headers: {
        Location: 'https://login.aknr.dev/authorize',
        'Set-Cookie': 'session_react-app-playground=value; Path=/; HttpOnly; Secure',
        'Cache-Control': 'no-store',
      },
    })
    const { assets } = setup(response)
    expect(await worker.fetch(new Request(`${origin}/auth/login`), { ASSETS: assets })).toBe(response)
  })

  describe('gateway へ渡す接続元 IP', () => {
    it('proxy_token と CF-Connecting-IP を gateway へ渡す', async () => {
      const request = await forwarded({ 'CF-Connecting-IP': '203.0.113.1' }, { AUTH_PROXY_TOKEN: 'secret' })
      expect(request.headers.get('X-Proxy-Token')).toBe('secret')
      expect(request.headers.get('X-Client-Ip')).toBe('203.0.113.1')
    })

    it('クライアントが送った X-Proxy-Token と X-Client-Ip を捨てる', async () => {
      const request = await forwarded(
        { 'CF-Connecting-IP': '203.0.113.1', 'X-Proxy-Token': 'forged', 'X-Client-Ip': '198.51.100.9' },
        { AUTH_PROXY_TOKEN: 'secret' },
      )
      expect(request.headers.get('X-Proxy-Token')).toBe('secret')
      expect(request.headers.get('X-Client-Ip')).toBe('203.0.113.1')
    })

    it.each([
      ['AUTH_PROXY_TOKEN が未設定', { 'CF-Connecting-IP': '203.0.113.1' }, {}],
      ['CF-Connecting-IP が無い', {}, { AUTH_PROXY_TOKEN: 'secret' }],
    ])('%sのときは、クライアントが送った値も含めて何も渡さない', async (_name, headers, env) => {
      const request = await forwarded({ ...headers, 'X-Proxy-Token': 'forged', 'X-Client-Ip': '198.51.100.9' }, env)
      expect(request.headers.get('X-Proxy-Token')).toBeNull()
      expect(request.headers.get('X-Client-Ip')).toBeNull()
    })

    it('API の中継には proxy_token を付けない', async () => {
      const { upstreamFetch, assets } = setup()
      await worker.fetch(new Request(`${origin}/api/customers`, { headers: { 'CF-Connecting-IP': '203.0.113.1' } }), {
        ASSETS: assets,
        AUTH_PROXY_TOKEN: 'secret',
      })
      const request = upstreamFetch.mock.calls[0]?.[0] as Request
      expect(request.headers.get('X-Proxy-Token')).toBeNull()
    })
  })

  it.each(['/dashboard', '/assets/app.js', '/author', '/apiculture', '/internal/session']) (
    '中継対象以外は静的アセットへ渡す: %s',
    async (path) => {
      const { upstreamFetch, assets } = setup()
      const request = new Request(`${origin}${path}`)
      expect(await (await worker.fetch(request, { ASSETS: assets })).text()).toBe('asset')
      expect(assets.fetch).toHaveBeenCalledWith(request)
      expect(upstreamFetch).not.toHaveBeenCalled()
    },
  )
})
