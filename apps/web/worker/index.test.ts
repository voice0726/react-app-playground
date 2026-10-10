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
