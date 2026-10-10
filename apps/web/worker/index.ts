interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  AUTH_ORIGIN?: string
  BACKEND_ORIGIN?: string
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
    }
    return fetch(new Request(upstream, { redirect: 'manual' }))
  },
}
