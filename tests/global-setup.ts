import { chromium, type FullConfig } from '@playwright/test'

const WARMUP_TIMEOUT = 60_000

/**
 * コールド起動の dev server では初回ページロードがモジュールのオンデマンド変換と
 * Service Worker 登録で数秒かかり、先頭テストが expect の 5000ms タイムアウトに
 * 収まらず落ちる。auth.spec.ts は serial なので1本落ちると残りも did not run になる。
 * テスト開始前に1回ページを開いてこのコストを吸収する。
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL

  if (baseURL === undefined) {
    throw new Error('baseURL is not configured')
  }

  if (baseURL === 'http://localhost:5173') {
    const statePaths = [process.env.E2E_USER_A_STORAGE_STATE, process.env.E2E_USER_B_STORAGE_STATE]
    if (statePaths.some((path) => path === undefined || path === '')) throw new Error('E2E_USER_A_STORAGE_STATE and E2E_USER_B_STORAGE_STATE must be set for backend integration tests')
    const fs = await import('node:fs/promises')
    for (const path of statePaths) { try { await fs.access(path as string) } catch { throw new Error(`E2E storage state does not exist: ${path}`) } }
    const response = await fetch(`${baseURL}/api/healthz`)
    if (!response.ok) throw new Error(`backend health check failed: ${response.status}`)
    const authResponse = await fetch(`${baseURL}/auth/me`)
    if (![200, 401].includes(authResponse.status)) throw new Error(`auth-gateway health check failed: ${authResponse.status}`)
    return
  }

  const browser = await chromium.launch()

  try {
    const page = await browser.newPage()

    await page.goto(new URL('/login', baseURL).toString())
    await page.getByRole('heading', { name: 'Sign in' }).waitFor({ timeout: WARMUP_TIMEOUT })
  } finally {
    await browser.close()
  }
}
