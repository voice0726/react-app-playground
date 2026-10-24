import { expect, test } from '@playwright/test'
import { appOrigin, createUserContext } from './helpers/auth'
import { createOrganization, selectOrganization } from './helpers/organization'

test('ログアウト失敗後に再試行でき、対象ユーザーのセッションだけを終了する', async ({ browser }) => {
  const a = await createUserContext(browser, 'a')
  const b = await createUserContext(browser, 'b')
  try {
    expect((await a.request.get('/auth/logout')).status()).toBe(405)
    expect((await a.request.post('/auth/logout', { headers: { Origin: 'http://other.localtest.me:5174' } })).status()).toBe(403)
    expect((await a.request.get('/auth/me')).status()).toBe(200)
    const page = await a.newPage()
    await selectOrganization(page, await createOrganization(a, 'E2E ログアウト'))
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()

    await page.route('**/auth/logout', (route) => route.fulfill({ status: 503 }))
    await page.getByRole('button', { name: 'サインアウト' }).click()
    await expect(page.getByRole('alert')).toHaveText('サインアウトできませんでした。もう一度お試しください。')
    expect((await a.request.get('/auth/me')).status()).toBe(200)

    await page.unroute('**/auth/logout')
    await page.getByRole('button', { name: 'サインアウト' }).click()
    await expect(page).toHaveURL(`${appOrigin}/login`)
    expect((await a.request.get('/auth/me')).status()).toBe(401)
    expect((await a.request.get('/api/customers')).status()).toBe(401)
    expect((await b.request.get('/auth/me')).status()).toBe(200)
  } finally {
    await a.close()
    await b.close()
  }
})
