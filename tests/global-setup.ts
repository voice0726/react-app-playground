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

  const browser = await chromium.launch()

  try {
    const page = await browser.newPage()

    await page.goto(new URL('/login', baseURL).toString())
    await page.getByRole('heading', { name: 'Sign in' }).waitFor({ timeout: WARMUP_TIMEOUT })
  } finally {
    await browser.close()
  }
}
