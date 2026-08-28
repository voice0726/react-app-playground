import type { Browser, BrowserContext, Page } from '@playwright/test'

export function storageStateFor(user: 'a' | 'b'): string {
  const value = user === 'a' ? process.env.E2E_USER_A_STORAGE_STATE : process.env.E2E_USER_B_STORAGE_STATE
  if (value === undefined || value === '') throw new Error(`E2E_USER_${user.toUpperCase()}_STORAGE_STATE must be set`)
  return value
}

export async function createUserContext(browser: Browser, user: 'a' | 'b'): Promise<BrowserContext> {
  return browser.newContext({ storageState: storageStateFor(user), baseURL: 'http://localhost:5173' })
}

export async function signOut(page: Page) { await page.request.post('/auth/logout?redirect=%2Flogin', { headers: { Origin: 'http://localhost:5173' } }) }
