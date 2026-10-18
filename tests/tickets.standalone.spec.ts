import { expect, test } from '@playwright/test'

test('MSWでチケットとコメントを作成・編集・削除できる', async ({ page }) => {
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

  await page.getByRole('button', { name: /^コメント \d+ を編集$/ }).click()
  await page.getByLabel('コメントを編集', { exact: true }).fill('更新したコメント')
  await page.getByRole('button', { name: '更新する', exact: true }).click()
  await expect(page.getByText('更新したコメント', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^コメント \d+ を削除$/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: '削除する', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('更新したコメント', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: '編集', exact: true }).click()
  await page.getByLabel('タイトル', { exact: true }).fill(`${title} 更新`)
  await page.getByRole('button', { name: '更新する', exact: true }).click()
  await expect(page.getByText(`${title} 更新`, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '削除', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'キャンセル', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText(`${title} 更新`, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '削除', exact: true }).click()
  await page.getByRole('button', { name: '削除する', exact: true }).click()
  await expect(page).toHaveURL(/\/tickets$/)
})

test('チケットのページングと表示件数を URL に保持する', async ({ page }) => {
  await page.goto('/tickets')

  await expect(page.locator('tbody tr')).toHaveCount(10)
  await expect(page.getByText('1-10 / 40', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '2', exact: true }).click()
  await expect(page.getByText('11-20 / 40', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/page=2/)

  await page.reload()
  await expect(page.getByText('11-20 / 40', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: '表示件数', exact: true }).click()
  await page.getByRole('option', { name: '20', exact: true }).click()
  await expect(page.getByText('1-20 / 40', { exact: true })).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(20)
  await expect(page).toHaveURL(/pageSize=20/)
})

test('チケットをタイトルと状態で検索し、空の結果から戻せる', async ({ page }) => {
  await page.goto('/tickets?page=2')
  await expect(page.getByText('11-20 / 40', { exact: true })).toBeVisible()

  await page.getByLabel('タイトル', { exact: true }).fill('Login')
  await page.getByRole('combobox', { name: 'ステータス', exact: true }).click()
  await page.getByRole('option', { name: 'Open', exact: true }).click()
  await page.getByRole('button', { name: '検索する', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByText('Login bug', { exact: true })).toBeVisible()
  await expect(page.getByText('1-1 / 1', { exact: true })).toBeVisible()

  await page.getByRole('combobox', { name: 'ステータス', exact: true }).click()
  await page.getByRole('option', { name: 'Closed', exact: true }).click()
  await page.getByRole('button', { name: '検索する', exact: true }).click()
  await expect(page.getByText('表示できるチケットがありません', { exact: true })).toBeVisible()
  await expect(page.getByText('Login bug', { exact: true })).toHaveCount(0)

  await page.getByRole('combobox', { name: 'ステータス', exact: true }).click()
  await page.getByRole('option', { name: 'Open', exact: true }).click()
  await page.getByLabel('タイトル', { exact: true }).fill('見つからないチケット')
  await page.getByRole('button', { name: '検索する', exact: true }).click()
  await expect(page.getByText('表示できるチケットがありません', { exact: true })).toBeVisible()

  await page.getByLabel('タイトル', { exact: true }).fill('Login')
  await page.getByRole('button', { name: '検索する', exact: true }).click()
  await expect(page.getByText('Login bug', { exact: true })).toBeVisible()
})

test('存在しないチケットのエラーを表示して一覧へ戻れる', async ({ page }) => {
  await page.goto('/tickets/999999')
  await expect(page.getByText('Ticket not found', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '一覧に戻る', exact: true }).first().click()
  await expect(page).toHaveURL(/\/tickets(?:\?|$)/)
  await expect(page.getByText('Login bug', { exact: true })).toBeVisible()
})
