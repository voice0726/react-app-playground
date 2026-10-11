import { expect, test } from '@playwright/test'

test('MSWで顧客を作成し、詳細を開ける', async ({ page }) => {
  const customerName = `単体 E2E 顧客 ${Date.now()}`
  await page.goto('/customers')
  await expect(page.getByRole('heading', { name: '顧客' })).toBeVisible()

  await page.getByRole('button', { name: '新規顧客', exact: true }).click()
  await page.getByLabel('名前', { exact: true }).fill(customerName)
  await page.getByLabel('メールアドレス', { exact: true }).fill(`e2e-${Date.now()}@example.com`)
  await page.getByLabel('電話番号', { exact: true }).fill('123')
  await page.getByRole('button', { name: '保存', exact: true }).click()

  await page.getByRole('button', { name: `${customerName} の詳細を見る`, exact: true }).click()
  await expect(page.getByRole('heading', { name: customerName })).toBeVisible()
})
