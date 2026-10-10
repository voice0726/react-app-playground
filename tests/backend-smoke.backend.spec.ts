import { expect, test } from '@playwright/test'

test('Vite proxy and authentication boundary are same-origin', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'サインイン' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'サインイン' })).toHaveAttribute('href', /\/auth\/login\?redirect=%2Fdashboard/)
  const login = await page.request.get('/auth/login?redirect=%2Fdashboard', { maxRedirects: 0 })
  expect(login.status()).toBe(302)
  const location = login.headers().location
  expect(location).toBeDefined()
  expect(new URL(location ?? '').hostname).toBe('auth.localtest.me')
})
