import { chromium, type FullConfig } from '@playwright/test'

const WARMUP_TIMEOUT = 60_000

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
