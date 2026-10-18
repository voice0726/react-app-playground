import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-04-06T03:00:00Z'))
})

const screens = [
  { name: 'customers', path: '/customers', ready: 'Acme Corporation' },
  { name: 'customer-detail', path: '/customers/customer-001', ready: 'billing@acme.example' },
  { name: 'deals', path: '/deals', ready: 'Acme CRM rollout' },
  { name: 'deal-detail', path: '/deals/deal-001', ready: 'billing@acme.example' },
  { name: 'invoices', path: '/invoices', ready: 'INV-2026-0001' },
  { name: 'invoice-detail', path: '/invoices/invoice-003', ready: 'INV-2026-0003' },
  { name: 'tasks', path: '/tasks', ready: 'Review Acme contract' },
  { name: 'tickets', path: '/tickets', ready: 'Login bug' },
  { name: 'ticket-detail', path: '/tickets/1', ready: 'Initial investigation started.' },
  { name: 'ticket-create', path: '/tickets/new', ready: '作成する' },
  { name: 'ticket-edit', path: '/tickets/1/edit', ready: '更新する' },
  { name: 'project-create', path: '/projects/new', ready: 'プロジェクトを作成' },
  { name: 'login', path: '/login', ready: 'おかえりなさい。' },
] as const

for (const screen of screens) {
  test(`${screen.name} の表示`, async ({ page }) => {
    await page.goto(screen.path)
    await expect(page.getByText(screen.ready, { exact: true })).toBeVisible()
    await expect(page.getByRole('status', { name: /読み込み中|更新中/ })).toHaveCount(0)

    await expect(page).toHaveScreenshot(`${screen.name}.png`, { fullPage: true })
  })
}

test('ダッシュボードの表示', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['10', '15', '8', '10'])
  await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true })
})

test('顧客作成モーダルの入力エラー', async ({ page }) => {
  await page.goto('/customers')
  await expect(page.getByText('Acme Corporation', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '新規顧客', exact: true }).click()
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('名前を入力してください', { exact: true })).toBeVisible()

  await expect(page).toHaveScreenshot('customer-validation.png', { fullPage: true })
})

test('顧客削除の確認ダイアログ', async ({ page }) => {
  await page.goto('/customers')
  await page.getByRole('button', { name: 'Acme Corporation を削除', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await expect(page).toHaveScreenshot('customer-delete.png', { fullPage: true })
})

test('顧客の検索結果が空の表示', async ({ page }) => {
  await page.goto('/customers?q=no-matching-customer')
  await expect(page.getByText('顧客が見つかりません。', { exact: true })).toBeVisible()

  await expect(page).toHaveScreenshot('customers-empty.png', { fullPage: true })
})
