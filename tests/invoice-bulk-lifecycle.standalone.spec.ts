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

test('競合後に最新の状態を表示して選び直せる', async ({ page }) => {
  await page.goto('/invoices')
  const selection = page.getByLabel('INV-2026-0003 を選択', { exact: true })
  await selection.check()
  await page.getByRole('button', { name: '送付済みにする', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  const changed = await page.evaluate(async () => {
    const response = await fetch('/api/invoices/invoice-003', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Organization-ID': '00000000-0000-4000-8000-000000000001' },
      body: JSON.stringify({ status: 'sent' }),
    })
    return response.status
  })
  expect(changed).toBe(200)
  await page.getByRole('button', { name: '変更する', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('状態が変更されている請求書があります')
  await expect(selection).not.toBeChecked()
  await expect(page.getByText('1 件選択中')).toHaveCount(0)
  const row = page.getByRole('row').filter({ hasText: 'INV-2026-0003' })
  await expect(row.getByText('送付済み', { exact: true })).toBeVisible()

  await selection.check()
  await page.getByRole('button', { name: '入金済みにする', exact: true }).click()
  await page.getByRole('button', { name: '変更する', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('1 件を入金済みに変更しました')
  await expect(row.getByText('支払済み', { exact: true })).toBeVisible()
})

for (const status of [200, 409]) {
  test(`${status} の遅延結果を同じ条件の再訪先に表示しない`, async ({ page }) => {
    await page.goto('/invoices')
    await page.evaluate((responseStatus) => {
      const state = window as Window & { bulkResponseWaiting?: boolean; releaseBulkResponse?: () => void }
      const originalFetch = window.fetch.bind(window)
      window.fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : String(input)
        if (!url.endsWith('/api/invoices/bulk-status')) return originalFetch(input, init)
        const response = responseStatus === 200
          ? await originalFetch(input, init)
          : new Response(JSON.stringify({ error: { details: { invoiceIds: ['invoice-003'] } } }), {
              status: responseStatus, headers: { 'Content-Type': 'application/json' },
            })
        await new Promise<void>((resolve) => {
          state.releaseBulkResponse = resolve
          state.bulkResponseWaiting = true
        })
        return response
      }
    }, status)
    const selection = page.getByLabel('INV-2026-0003 を選択', { exact: true })
    await selection.check()
    await page.getByRole('button', { name: '送付済みにする', exact: true }).click()
    await page.getByRole('button', { name: '変更する', exact: true }).click()
    await page.waitForFunction(() => (window as Window & { bulkResponseWaiting?: boolean }).bulkResponseWaiting)

    await page.getByRole('button', { name: '金額' }).click()
    await expect(page).toHaveURL(/sort=amount/)
    await page.goBack()
    await expect(page).toHaveURL(/\/invoices$/)
    await expect(selection).not.toBeChecked()
    await expect(selection).toBeDisabled()
    await page.evaluate(() => (window as Window & { releaseBulkResponse?: () => void }).releaseBulkResponse?.())
    await expect(selection).toBeEnabled()

    await expect(page.getByText('1 件を送付済みに変更しました。', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
    const row = page.getByRole('row').filter({ hasText: 'INV-2026-0003' })
    await expect(row.getByText(status === 200 ? '送付済み' : '下書き', { exact: true })).toBeVisible()
  })
}
