export type SessionUser = { id: string; name: string; email: string }
export type SessionResult = { status: 'authenticated'; user: SessionUser } | { status: 'unauthenticated' } | { status: 'unavailable'; reason: 'network' | 'timeout' | 'server' | 'invalid' }
export type SessionStatus = SessionResult['status'] | 'loading'
export function shouldRedirectToLogin(status: SessionStatus): boolean { return status === 'unauthenticated' }
export function parseGatewayUser(value: unknown): SessionUser | null {
  if (value === null || typeof value !== 'object') return null
  const user = value as Record<string, unknown>
  if (typeof user.user_id !== 'string' || user.user_id === '' || typeof user.name !== 'string' || typeof user.email !== 'string') return null
  return { id: user.user_id, name: user.name, email: user.email }
}
export function loginURL(path = '/dashboard'): string {
  const safe = path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : '/dashboard'
  return `/auth/login?redirect=${encodeURIComponent(safe)}`
}

export async function fetchSession(url = '/auth/me', timeoutMs = 5000): Promise<SessionResult> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (response.status === 401) return { status: 'unauthenticated' }
    if (!response.ok) return { status: 'unavailable', reason: response.status >= 500 ? 'server' : 'invalid' }
    const user = parseGatewayUser((await response.json()) as unknown)
    return user === null ? { status: 'unavailable', reason: 'invalid' } : { status: 'authenticated', user }
  } catch (error) {
    return { status: 'unavailable', reason: error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network' }
  } finally { window.clearTimeout(timer) }
}
