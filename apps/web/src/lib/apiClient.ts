import { useSessionStore } from '@/lib/stores/session.store'
export class ApiError extends Error { constructor(public readonly status: number, message: string) { super(message); this.name = 'ApiError' } }
export function handleUnauthorized(): void { useSessionStore.getState().clearSession(); if (window.location.pathname !== '/login') window.location.assign('/login') }
export async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try { response = await fetch(url, { ...init, headers: { ...(init.body === undefined ? {} : { 'content-type': 'application/json' }), ...init.headers } }) } catch (error) { throw new ApiError(0, error instanceof Error ? error.message : 'Network error') }
  if (!response.ok) { if (response.status === 401) handleUnauthorized(); throw new ApiError(response.status, `Request failed: ${url}`) }
  return (await response.json()) as T
}
export const fetchJson = <T>(url: string): Promise<T> => requestJson<T>(url)
