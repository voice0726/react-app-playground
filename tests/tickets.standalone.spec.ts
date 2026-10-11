import { expect, test } from '@playwright/test'

test('MSWでチケットを作成し、コメント後に削除できる', async ({ page }) => {
  const title = `単体 E2E チケット ${Date.now()}`
  await page.goto('/tickets/new')
  await page.getByLabel('タイトル', { exact: true }).fill(title)
  const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/tickets') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '作成する', exact: true }).click()
  const ticket = await (await createResponse).json() as { id: number }
  await expect(page.getByRole('heading', { name: `チケット #${ticket.id}` })).toBeVisible()

  await page.getByLabel('コメントを追加').fill('単体 E2E コメント')
  await page.getByRole('button', { name: '投稿する', exact: true }).click()
  await expect(page.getByText('単体 E2E コメント', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '削除', exact: true }).first().click()
  await page.getByRole('button', { name: '削除する', exact: true }).click()
  await expect(page).toHaveURL(/\/tickets$/)
})
