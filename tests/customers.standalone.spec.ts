import { expect, type Page, test } from '@playwright/test'

test('MSWで顧客を作成・編集し、確認後に削除できる', async ({ page }) => {
  const customerName = `単体 E2E 顧客 ${Date.now()}`
  await page.goto('/customers')
  await expect(page.getByRole('heading', { name: '顧客' })).toBeVisible()

  await page.getByRole('button', { name: '新規顧客', exact: true }).click()
  await page.getByLabel('名前', { exact: true }).fill(customerName)
  await page.getByLabel('メールアドレス', { exact: true }).fill(`e2e-${Date.now()}@example.com`)
  await page.getByLabel('電話番号', { exact: true }).fill('123')

  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()

  // 既定の並びでは作成した顧客が2ページ目に入るため、検索で絞り込んでから開く
  await page.getByLabel('検索', { exact: true }).fill(customerName)
  await page.getByRole('button', { name: `${customerName} の詳細を見る`, exact: true }).click()
  await expect(page.getByRole('heading', { name: customerName })).toBeVisible()

  await page.getByRole('button', { name: '編集', exact: true }).click()
  await page.getByLabel('名前', { exact: true }).fill(`${customerName} 更新`)

  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('heading', { name: `${customerName} 更新`, exact: true })).toBeVisible()

  await page.getByRole('link', { name: '顧客一覧に戻る', exact: true }).click()
  await page.getByLabel('検索', { exact: true }).fill(customerName)

  await page.getByRole('button', { name: `${customerName} 更新 を削除`, exact: true }).click()
  await page.getByRole('button', { name: 'キャンセル', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button', { name: `${customerName} 更新 の詳細を見る`, exact: true })).toBeVisible()

  await page.getByRole('button', { name: `${customerName} 更新 を削除`, exact: true }).click()
  await page.getByRole('button', { name: '削除する', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button', { name: `${customerName} 更新 の詳細を見る`, exact: true })).toHaveCount(0)
})

test('顧客の検索とソートを URL に保持し、再読み込み後も復元する', async ({ page }) => {
  await page.goto('/customers')
  await page.getByLabel('検索', { exact: true }).fill('Acme')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByText('Acme Corporation', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/q=Acme/)

  await page.reload()
  await expect(page.getByLabel('検索', { exact: true })).toHaveValue('Acme')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByText('Acme Corporation', { exact: true })).toBeVisible()
  await page.getByLabel('検索', { exact: true }).fill('')
  await expect(page.locator('tbody tr')).toHaveCount(10)

  const ascendingNames = [
    'Acme Corporation',
    'Blue Ridge Trading',
    'Greenfield Partners',
    'Harbor Labs',
    'Metro Digital',
    'Northstar Systems',
    'Orion Foods',
    'Silverline Media',
    'Summit Works',
    'Vertex Logistics',
  ]

  const names = page.locator('tbody tr td:first-child')
  await page.getByRole('button', { name: '名前', exact: true }).click()
  await expect(page).toHaveURL(/sort=name/)
  await expect(page).toHaveURL(/order=asc/)
  await expect(names).toHaveText(ascendingNames)

  await page.reload()
  await expect(page).toHaveURL(/sort=name/)
  await expect(page).toHaveURL(/order=asc/)
  await expect(names).toHaveText(ascendingNames)
  await page.getByRole('button', { name: /^名前/ }).click()
  await expect(page).toHaveURL(/order=desc/)
  await expect(names).toHaveText(ascendingNames.toReversed())

  await page.reload()
  await expect(page).toHaveURL(/sort=name/)
  await expect(page).toHaveURL(/order=desc/)
  await expect(names).toHaveText(ascendingNames.toReversed())

  await page.getByLabel('検索', { exact: true }).fill('見つからない顧客')
  await expect(page.getByText('顧客が見つかりません。', { exact: true })).toBeVisible()
  await page.getByLabel('検索', { exact: true }).fill('')
  await expect(page.locator('tbody tr')).toHaveCount(10)
})

test('顧客フォームの必須項目を検証する', async ({ page }) => {
  await page.goto('/customers')

  await page.getByRole('button', { name: '新規顧客', exact: true }).click()

  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('名前を入力してください', { exact: true })).toBeVisible()
  await expect(page.getByText('有効なメールアドレスを入力してください', { exact: true })).toBeVisible()
  await expect(page.getByText('電話番号を入力してください', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
})

async function createCustomer(page: Page, name: string) {
  await page.getByRole('button', { name: '新規顧客', exact: true }).click()
  await page.getByLabel('名前', { exact: true }).fill(name)
  await page.getByLabel('メールアドレス', { exact: true }).fill(`e2e-${Date.now()}@example.com`)
  await page.getByLabel('電話番号', { exact: true }).fill('123')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test('末尾ページを消して移動した後に件数が戻ったら、2ページ目を開ける', async ({ page }) => {
  await page.goto('/customers')
  await createCustomer(page, 'E2E 末尾の顧客')

  await page.getByRole('button', { name: '2 ページ目', exact: true }).click()
  await page.getByRole('button', { name: 'E2E 末尾の顧客 を削除', exact: true }).click()
  await page.getByRole('button', { name: '削除する', exact: true }).click()
  await expect(page).not.toHaveURL(/page=/)
  await expect(page.locator('tbody tr')).toHaveCount(10)

  await createCustomer(page, 'E2E 追加した顧客')
  await page.getByRole('button', { name: '2 ページ目', exact: true }).click()
  await expect(page.getByRole('button', { name: 'E2E 追加した顧客 の詳細を見る', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/page=2/)
})

test('検索に失敗しても検索欄を残し、検索語を直せる', async ({ page }) => {
  await page.goto('/customers')
  const searchInput = page.getByLabel('検索', { exact: true })

  await searchInput.fill('a'.repeat(201))
  await expect(page.getByText('顧客を読み込めませんでした。', { exact: true })).toBeVisible()
  await expect(searchInput).toBeVisible()

  await searchInput.fill('Acme')
  await expect(page.getByText('顧客を読み込めませんでした。', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Acme Corporation', { exact: true })).toBeVisible()
})
