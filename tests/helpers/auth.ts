import type { Browser, BrowserContext } from '@playwright/test'

export const appOrigin = 'http://react.localtest.me:5174'

export function storageStateFor(user: 'a' | 'b'): string {
  const value = user === 'a' ? process.env.E2E_USER_A_STORAGE_STATE : process.env.E2E_USER_B_STORAGE_STATE
  if (value === undefined || value === '') throw new Error(`E2E_USER_${user.toUpperCase()}_STORAGE_STATE must be set`)
  return value
}

export async function createUserContext(browser: Browser, user: 'a' | 'b'): Promise<BrowserContext> {
  return browser.newContext({ storageState: storageStateFor(user), baseURL: appOrigin })
}
