import { expect } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { appOrigin } from './auth'

export type Organization = { id: string; name: string }
type Role = 'admin' | 'editor' | 'viewer'

export function organizationHeaders(organization: Organization) {
  return { Origin: appOrigin, 'X-Organization-ID': organization.id }
}

export async function createOrganization(context: BrowserContext, label: string): Promise<Organization> {
  const response = await context.request.post('/api/organizations', { headers: { Origin: appOrigin }, data: { name: `${label} ${Date.now()}` } })
  expect(response.status()).toBe(201)
  return await response.json() as Organization
}

export async function userIdOf(context: BrowserContext): Promise<string> {
  const response = await context.request.get('/auth/me')
  expect(response.status()).toBe(200)
  return (await response.json() as { user_id: string }).user_id
}

export async function addMember(context: BrowserContext, organization: Organization, userId: string, role: Role) {
  const response = await context.request.post(`/api/organizations/${organization.id}/members`, { headers: { Origin: appOrigin }, data: { userId, role } })
  expect(response.status()).toBe(201)
}

export async function changeMemberRole(context: BrowserContext, organization: Organization, userId: string, role: Role) {
  const response = await context.request.patch(`/api/organizations/${organization.id}/members/${encodeURIComponent(userId)}`, { headers: { Origin: appOrigin }, data: { role } })
  expect(response.status()).toBe(200)
}

// storage state は sessionStorage の組織選択を持たないため、画面テストは毎回組織を選び直す。
export async function selectOrganization(page: Page, organization: Organization) {
  await page.goto('/dashboard')
  const switcher = page.getByRole('combobox', { name: '組織', exact: true })
  await switcher.click()
  await page.getByRole('option', { name: organization.name, exact: true }).click()
  await expect(switcher).toHaveValue(organization.name)
  await expect(page.getByRole('heading', { name: 'ダッシュボード', exact: true })).toBeVisible()
}
