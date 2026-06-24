import { expect, test, type Locator } from '@playwright/test'

import { loginAsDemo, signOut } from './helpers/auth'

async function setInputValue(locator: Locator, value: string) {
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

    valueSetter?.call(input, nextValue)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: nextValue }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

test.beforeEach(async ({ page }) => {
  await signOut(page)
  await loginAsDemo(page)
})

test('shows the deals list after sign in', async ({ page }) => {
  await page.getByRole('link', { name: 'Deals' }).click()

  await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible()
  await expect(page.getByText('Acme CRM rollout')).toBeVisible()
})

test('opens the new deal form with customer options', async ({ page }) => {
  await page.getByRole('link', { name: 'Deals' }).click()
  await page.getByRole('button', { name: 'New Deal' }).dispatchEvent('click')
  await expect(page.getByRole('dialog', { name: 'New Deal' })).toBeVisible()
  const customerSelect = page.getByRole('combobox', { name: 'Customer' })

  await expect(customerSelect).toBeEnabled()
  await customerSelect.dispatchEvent('click')
  await expect(page.getByRole('option', { name: 'Acme Corporation' })).toBeVisible()
})

test('creates a deal and shows the related customer section on detail', async ({ page }) => {
  const dealTitle = `Phase 5 Deal ${Date.now()}`

  await page.getByRole('link', { name: 'Deals' }).click()
  await page.getByRole('button', { name: 'New Deal' }).dispatchEvent('click')
  await expect(page.getByRole('dialog', { name: 'New Deal' })).toBeVisible()
  await page.getByLabel('Title').fill(dealTitle)
  const customerSelect = page.getByRole('combobox', { name: 'Customer' })

  await expect(customerSelect).toBeEnabled()
  await customerSelect.dispatchEvent('click')
  await page.getByRole('option', { name: 'Acme Corporation' }).dispatchEvent('click')
  await setInputValue(page.getByLabel('Amount'), '250000')
  await page
    .getByRole('dialog', { name: 'New Deal' })
    .getByRole('button', { name: 'Save' })
    .dispatchEvent('click')

  await expect(page.getByText(dealTitle)).toBeVisible()
  await page.getByRole('button', { name: `View ${dealTitle}` }).click()

  await expect(page.getByRole('heading', { name: dealTitle })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Customer' })).toBeVisible()
  await expect(page.getByText('Acme Corporation')).toBeVisible()
  await expect(page.getByText('billing@acme.example')).toBeVisible()
})
