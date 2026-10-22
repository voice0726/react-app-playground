import type { ReactNode } from 'react'
import { OrganizationContext, type Organization } from '@/lib/organization'
import { MOCK_ORGANIZATION_ID } from '@/mocks/handlers/organizations'

export const testOrganization: Organization = { id: MOCK_ORGANIZATION_ID, name: 'デモ組織', role: 'admin' }

export function TestOrganization({ children }: { children: ReactNode }) {
  return <OrganizationContext.Provider value={testOrganization}>{children}</OrganizationContext.Provider>
}

export function fetchAsOrganization(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('X-Organization-ID', testOrganization.id)
  return fetch(input, { ...init, headers })
}
