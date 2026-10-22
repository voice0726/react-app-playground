import { createContext, useContext } from 'react'

export type OrganizationRole = 'admin' | 'editor' | 'viewer'
export type Organization = { id: string; name: string; role: OrganizationRole }
export const organizationRoles = [
  { value: 'admin', label: '管理者' },
  { value: 'editor', label: '編集者' },
  { value: 'viewer', label: '閲覧者' },
] as const

export const OrganizationContext = createContext<Organization | null>(null)

export function useOrganization() {
  const organization = useContext(OrganizationContext)
  if (organization === null) throw new Error('Organization context is required')
  return { organization, canEdit: organization.role === 'admin' || organization.role === 'editor', canAdmin: organization.role === 'admin' }
}
