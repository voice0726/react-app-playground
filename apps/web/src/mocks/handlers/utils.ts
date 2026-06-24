import { HttpResponse } from 'msw'

export function createId(prefix: string, length: number): string {
  return `${prefix}-${String(length + 1).padStart(3, '0')}`
}

export function notFound(resource: string): Response {
  return HttpResponse.json({ message: `${resource} not found` }, { status: 404 })
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null)

  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    return body as Record<string, unknown>
  }

  return {}
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}
