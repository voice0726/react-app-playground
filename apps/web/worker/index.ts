interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  AUTH_ORIGIN?: string
  BACKEND_ORIGIN?: string
  // gateway の proxy_token。設定されているときだけ、接続元 IP を gateway へ渡す。
  AUTH_PROXY_TOKEN?: string
}

const backendOrigin = 'https://react-app-playground-backend-tqhoqdmw4a-uc.a.run.app'
const authOrigin = 'https://auth.aknr.dev'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const isAuth = url.pathname === '/auth' || url.pathname.startsWith('/auth/')
    const isAPI = url.pathname === '/api' || url.pathname.startsWith('/api/')

    if (!isAuth && !isAPI) return env.ASSETS.fetch(request)

    const upstreamOrigin = isAuth
      ? env.AUTH_ORIGIN ?? authOrigin
      : env.BACKEND_ORIGIN ?? backendOrigin
    const upstreamURL = new URL(upstreamOrigin)
    url.host = upstreamURL.host
    url.protocol = upstreamURL.protocol
    const upstream = new Request(url, request)
    if (isAuth) {
      upstream.headers.delete('X-App-Id')
      upstream.headers.set('X-App-Id', 'react-app-playground')
      // クライアントが送った値は、偽装に使われるため必ず捨てる。
      upstream.headers.delete('X-Proxy-Token')
      upstream.headers.delete('X-Client-Ip')
      const clientIp = request.headers.get('CF-Connecting-IP')
      if (env.AUTH_PROXY_TOKEN && clientIp) {
        upstream.headers.set('X-Proxy-Token', env.AUTH_PROXY_TOKEN)
        upstream.headers.set('X-Client-Ip', clientIp)
      }
    }
    return fetch(new Request(upstream, { redirect: 'manual' }))
  },
}
