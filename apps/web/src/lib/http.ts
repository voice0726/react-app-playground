import { handleUnauthorized } from '@/lib/apiClient'

export class HttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = '認証が必要です。') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class NetworkError extends Error {
  endpoint: string
  cause: unknown

  constructor(message: string, endpoint: string, cause: unknown) {
    super(message)
    this.name = 'NetworkError'
    this.endpoint = endpoint
    this.cause = cause
  }
}

export class ApiContractError extends Error {
  endpoint: string
  cause: unknown

  constructor(endpoint: string, cause: unknown) {
    super('APIレスポンスの形式が不正です。')
    this.name = 'ApiContractError'
    this.endpoint = endpoint
    this.cause = cause
  }
}

export const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} satisfies Record<string, string>

const extractMessage = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null) {
    return null
  }

  const record = body as Record<string, unknown>
  const nested = record.error
  const candidate =
    typeof nested === 'object' && nested !== null
      ? (nested as Record<string, unknown>).message
      : record.message

  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate : null
}

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const body: unknown = await response.json()
      return extractMessage(body) ?? fallback
    }

    const text = (await response.text()).trim()
    return text || fallback
  } catch {
    return fallback
  }
}

export const ensureSuccess = async (response: Response, fallbackMessage: string) => {
  if (response.ok) {
    return
  }

  const message = await readErrorMessage(response, fallbackMessage)

  if (response.status === 401) {
    handleUnauthorized()
    throw new UnauthorizedError(message)
  }

  throw new HttpError(message, response.status)
}

export const fetchApi = async (endpoint: string, options: RequestInit, fallbackMessage: string) => {
  try {
    return await fetch(endpoint, options)
  } catch (error) {
    throw new NetworkError(fallbackMessage, endpoint, error)
  }
}

export const parseJsonResponse = async <T>(
  response: Response,
  endpoint: string,
  parse: (value: unknown) => T,
): Promise<T> => {
  try {
    return parse(await response.json())
  } catch (error) {
    throw new ApiContractError(endpoint, error)
  }
}
