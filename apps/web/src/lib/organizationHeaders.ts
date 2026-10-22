export function organizationHeaders(organizationId: string, init?: HeadersInit): Headers {
  if (!organizationId) throw new Error('Organization ID is required')
  const headers = new Headers(init)
  headers.set('X-Organization-ID', organizationId)
  return headers
}
