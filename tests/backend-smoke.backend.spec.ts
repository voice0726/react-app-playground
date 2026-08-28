import { expect, test } from '@playwright/test'

test('Vite proxy and authentication boundary are same-origin', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', /\/auth\/login\?redirect=%2Fdashboard/)
})
