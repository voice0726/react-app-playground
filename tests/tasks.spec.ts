import { expect, test } from '@playwright/test'

import { loginAsDemo, signOut } from './helpers/auth'

test.beforeEach(async ({ page }) => {
  await signOut(page)
  await loginAsDemo(page)
})

test('shows the kanban board after sign in', async ({ page }) => {
  await page.getByRole('link', { name: 'Tasks' }).click()

  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Todo' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'In progress' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible()
})

test('creates a task in the todo column', async ({ page }) => {
  const taskTitle = `Phase 5 Task ${Date.now()}`

  await page.getByRole('link', { name: 'Tasks' }).click()
  await page.getByRole('button', { name: 'Add Todo task' }).click()
  await page.getByLabel('Title').fill(taskTitle)
  await page.getByLabel('Description').fill('Created by the Phase 5 E2E test.')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText(taskTitle)).toBeVisible()
})
