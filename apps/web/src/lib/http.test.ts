import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type NetworkError,
  ApiContractError,
  ensureSuccess,
  fetchApi,
  HttpError,
  parseJsonResponse,
  UnauthorizedError,
} from '@/lib/http'
import { handleUnauthorized } from '@/lib/apiClient'

vi.mock('@/lib/apiClient', () => ({ handleUnauthorized: vi.fn() }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ensureSuccess', () => {
  it('allows successful responses', async () => {
    await expect(
      ensureSuccess(new Response(null, { status: 204 }), 'fallback'),
    ).resolves.toBeUndefined()
  })

  it('uses a JSON message when available', async () => {
    await expect(
      ensureSuccess(
        new Response(JSON.stringify({ message: 'invalid request' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
        'fallback',
      ),
    ).rejects.toMatchObject({ name: 'HttpError', message: 'invalid request', status: 400 })
  })

  it('uses the nested error message of the backend error envelope', async () => {
    await expect(
      ensureSuccess(
        new Response(JSON.stringify({ error: { code: 'not_found', message: 'ticket not found' } }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
        'fallback',
      ),
    ).rejects.toMatchObject({ name: 'HttpError', message: 'ticket not found', status: 404 })
  })

  it('uses plain text responses', async () => {
    await expect(
      ensureSuccess(new Response('service unavailable', { status: 503 }), 'fallback'),
    ).rejects.toMatchObject({ message: 'service unavailable', status: 503 })
  })

  it('uses the fallback for empty or malformed error bodies', async () => {
    await expect(
      ensureSuccess(new Response('', { status: 500 }), 'fallback'),
    ).rejects.toMatchObject({
      message: 'fallback',
      status: 500,
    })
    await expect(
      ensureSuccess(
        new Response('{malformed', {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
        'fallback',
      ),
    ).rejects.toMatchObject({ message: 'fallback', status: 500 })
  })

  it('returns UnauthorizedError for 401 responses', async () => {
    await expect(
      ensureSuccess(
        new Response(JSON.stringify({ message: 'authentication required' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
        'fallback',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError)
    expect(handleUnauthorized).toHaveBeenCalledOnce()
  })

  it('returns HttpError for non-401 failures', async () => {
    await expect(
      ensureSuccess(new Response(null, { status: 422 }), 'fallback'),
    ).rejects.toBeInstanceOf(HttpError)
  })
})

describe('shared request helpers', () => {
  it('wraps network failures with endpoint diagnostics', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchApi('/api/tickets', {}, '取得に失敗しました。')).rejects.toMatchObject({
      name: 'NetworkError',
      message: '取得に失敗しました。',
      endpoint: '/api/tickets',
    } satisfies Partial<NetworkError>)
  })

  it('preserves parser failures as contract errors', async () => {
    const parserError = new Error('invalid ticket shape')

    await expect(
      parseJsonResponse(Response.json({ id: 'not-a-number' }), '/api/tickets', () => {
        throw parserError
      }),
    ).rejects.toMatchObject({
      endpoint: '/api/tickets',
      cause: parserError,
    } satisfies Partial<ApiContractError>)
  })

  it('wraps malformed JSON and parser failures as contract errors', async () => {
    await expect(
      parseJsonResponse(
        new Response('{invalid', { headers: { 'content-type': 'application/json' } }),
        '/api/tickets',
        (value) => value,
      ),
    ).rejects.toBeInstanceOf(ApiContractError)
  })
})
