import { expect, test } from '@playwright/test'

import { loginAsDemo, signOut } from './helpers/auth'

test.beforeEach(async ({ page }) => {
  await signOut(page)
  await loginAsDemo(page)
})

test('shows the customers list after sign in', async ({ page }) => {
  await page.getByRole('link', { name: 'Customers' }).click()

  await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  await expect(page.getByText('Acme Corporation')).toBeVisible()
})

test('creates a customer and opens its detail page', async ({ page }) => {
  const suffix = Date.now()
  const customerName = `Phase 5 Customer ${suffix}`

  await page.getByRole('link', { name: 'Customers' }).click()
  await page.getByRole('button', { name: 'New Customer' }).click()
  await expect(page.getByRole('dialog', { name: 'New Customer' })).toBeVisible()
  await page.getByLabel('Name').fill(customerName)
  await page.getByLabel('Email').fill(`phase5-${suffix}@example.com`)
  await page.getByLabel('Phone').fill('03-5555-0001')
  await page
    .getByRole('dialog', { name: 'New Customer' })
    .getByRole('button', { name: 'Save' })
    .click()

  await expect(page.getByText(customerName)).toBeVisible()
  await page.getByRole('button', { name: `View ${customerName}` }).click()

  await expect(page.getByRole('heading', { name: customerName })).toBeVisible()
  await expect(page.getByText(`phase5-${suffix}@example.com`)).toBeVisible()
})
