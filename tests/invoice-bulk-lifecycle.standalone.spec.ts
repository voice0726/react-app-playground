import { expect, test } from '@playwright/test'

test('検索中の連続入力でフォーカスを維持する', async ({ page }) => {
  await page.goto('/invoices')
  const search = page.getByLabel('検索', { exact: true })
  await search.pressSequentially('INV', { delay: 150 })
  await expect(search).toHaveValue('INV')
  await expect(search).toBeFocused()
})

test('履歴でソート条件へ戻っても選択を復元しない', async ({ page }) => {
  await page.goto('/invoices')
  await page.getByRole('button', { name: '金額' }).click()
  await expect(page).toHaveURL(/sort=amount/)
  await page.getByLabel('INV-2026-0003 を選択', { exact: true }).check()
  await expect(page.getByText('1 件選択中')).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/invoices(?:\?.*)?$/)
  await page.goForward()
  await expect(page).toHaveURL(/sort=amount/)
  await expect(page.getByLabel('INV-2026-0003 を選択', { exact: true })).not.toBeChecked()
  await expect(page.getByText('1 件選択中')).toHaveCount(0)
})

test('ソート変更後に古い確認ダイアログから更新できない', async ({ page }) => {
  await page.goto('/invoices')
  await page.getByRole('button', { name: '金額' }).click()
  await expect(page).toHaveURL(/sort=amount/)
  await page.getByLabel('INV-2026-0003 を選択', { exact: true }).check()
  await page.getByRole('button', { name: '送付済みにする', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const bulkRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/invoices/bulk-status')) bulkRequests.push(request.method())
  })

  await page.goBack()
  await expect(page).toHaveURL(/\/invoices(?:\?.*)?$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(bulkRequests).toEqual([])
})

test('一覧を離れると確認ダイアログが消え更新できない', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('link', { name: /請求書/ }).first().click()
  await expect(page).toHaveURL(/\/invoices/)
  await page.getByLabel('INV-2026-0003 を選択', { exact: true }).check()
  await page.getByRole('button', { name: '送付済みにする', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const bulkRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/invoices/bulk-status')) bulkRequests.push(request.method())
  })

  await page.goBack()
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(bulkRequests).toEqual([])
})
