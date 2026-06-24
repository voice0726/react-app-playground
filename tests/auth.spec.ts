import { expect, test } from '@playwright/test'

import { loginAsDemo, signOut } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ page }) => {
  await signOut(page)
})

test('shows the login page', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible()
})

test('signs in with demo credentials and navigates to dashboard', async ({ page }) => {
  await loginAsDemo(page)

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('redirects unauthenticated customers access to login', async ({ page }) => {
  await page.goto('/customers')

  await expect(page).toHaveURL(/\/login$/)
})

test('signs out and returns to login', async ({ page }) => {
  await loginAsDemo(page)
  await page.getByRole('button', { name: 'Sign out' }).dispatchEvent('click')

  await expect(page).toHaveURL(/\/login$/)
})
