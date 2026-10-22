import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function selectOrganization(page: Page, name: string) {
  await page.getByRole('combobox', { name: '組織', exact: true }).click()
  await page.getByRole('option', { name, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'ダッシュボード', exact: true })).toBeVisible()
}

async function addAdmin(page: Page) {
  await page.getByRole('link', { name: '組織と権限' }).click()
  await page.getByLabel('追加するユーザーID').fill('second-admin')
  await page.getByRole('combobox', { name: '追加する権限', exact: true }).click()
  await page.getByRole('option', { name: '管理者', exact: true }).click()
  await page.getByRole('button', { name: 'メンバーを追加' }).click()
  await expect(page.getByRole('cell', { name: 'second-admin', exact: true })).toBeVisible()
}

async function changeOwnRole(page: Page, role: string) {
  await page.getByRole('combobox', { name: '1 の権限', exact: true }).click()
  await page.getByRole('option', { name: role, exact: true }).click()
  await page.getByRole('button', { name: '変更を確定する' }).click()
  await expect(page.getByText(`権限: ${role}`, { exact: true })).toBeVisible()
}

test('組織を作成して切り替えると業務データとフォーム状態が分離する', async ({ page }) => {
  await page.goto('/tickets/1')
  await expect(page.getByText('Login bug', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '組織を作成', exact: true }).click()
  await page.getByLabel('組織名').fill('独立した組織')
  await page.getByRole('button', { name: '作成する', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'ダッシュボード', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'チケット', exact: true }).click()
  await expect(page.getByText('Login bug', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '新規作成' }).click()
  await page.getByLabel('タイトル').fill('保存前の入力')
  await page.getByRole('button', { name: /一覧に戻る/ }).first().click()
  await selectOrganization(page, 'デモ組織')
  await page.getByRole('link', { name: 'チケット', exact: true }).click()
  await expect(page.getByText('Login bug', { exact: true })).toBeVisible()
  await selectOrganization(page, '独立した組織')
  await page.getByRole('link', { name: 'チケット', exact: true }).click()
  await page.getByRole('button', { name: '新規作成' }).click()
  await expect(page.getByLabel('タイトル')).toHaveValue('')
})

test('閲覧者は既存データを参照でき、全機能の更新操作が制限される', async ({ page }) => {
  await page.goto('/organization')
  await addAdmin(page)
  await changeOwnRole(page, '閲覧者')
  await expect(page.getByText('メンバーの管理は管理者のみ操作できます。')).toBeVisible()
  for (const [label, button] of [['顧客', '新規顧客'], ['案件', '新規案件'], ['請求書', '新規請求書']] as const) {
    await page.getByRole('link', { name: label, exact: true }).click()
    await expect(page.getByRole('button', { name: button, exact: true })).toBeDisabled()
  }
  await page.getByRole('link', { name: 'タスク', exact: true }).click()
  await expect(page.getByRole('button', { name: /タスクを追加/ }).first()).toBeDisabled()
  await expect(page.getByLabel(/を移動/)).toHaveCount(0)
  await page.getByRole('link', { name: 'チケット', exact: true }).click()
  await page.getByRole('row').filter({ hasText: 'Login bug' }).getByRole('button', { name: '詳細', exact: true }).click()
  await expect(page.getByText('Login bug', { exact: true })).toBeVisible()
  await expect(page.getByText('権限: 閲覧者', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '編集', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('コメントを追加')).toHaveCount(0)
  await selectOrganization(page, '閲覧者の組織')
  await page.goto('/tickets/new')
  await expect(page.getByText('閲覧者はチケットを変更できません。')).toBeVisible()
  await page.goto('/tickets/1/edit')
  await expect(page.getByText('閲覧者はチケットを変更できません。')).toBeVisible()
})

test('編集者は他の作成者のチケットを編集でき、メンバー管理はできない', async ({ page }) => {
  await page.goto('/organization')
  await addAdmin(page)
  await changeOwnRole(page, '編集者')
  await expect(page.getByText('メンバーの管理は管理者のみ操作できます。')).toBeVisible()
  await page.getByRole('link', { name: 'チケット', exact: true }).click()
  await page.getByRole('row').filter({ hasText: 'Login bug' }).getByRole('button', { name: '詳細', exact: true }).click()
  await expect(page.getByText('権限: 編集者', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '編集', exact: true }).click()
  await page.getByLabel('タイトル').fill('組織で共有したチケット')
  await page.getByRole('button', { name: '更新する' }).click()
  await expect(page.getByText('組織で共有したチケット', { exact: true }).first()).toBeVisible()
})

test('管理者はメンバーを削除でき、最後の管理者は削除できない', async ({ page }) => {
  await page.goto('/organization')
  await page.getByRole('row').filter({ hasText: '1（自分）' }).getByRole('button', { name: '削除', exact: true }).click()
  await page.getByRole('button', { name: '変更を確定する' }).click()
  await expect(page.getByRole('dialog').getByText('最後の管理者は削除・降格できません。別の管理者を追加してから操作してください。')).toBeVisible()
  await page.keyboard.press('Escape')
  await addAdmin(page)
  await page.getByRole('row').filter({ hasText: 'second-admin' }).getByRole('button', { name: '削除', exact: true }).click()
  await page.getByRole('button', { name: '変更を確定する' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('cell', { name: 'second-admin', exact: true })).toHaveCount(0)
  await expect(page.getByText('権限: 管理者', { exact: true })).toBeVisible()
})
