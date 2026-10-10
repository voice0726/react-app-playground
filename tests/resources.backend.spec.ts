import { expect, test } from '@playwright/test'
import { appOrigin, createUserContext } from './helpers/auth'

test('isolates all four resources and preserves status transition errors', async ({ browser }) => {
  const a = await createUserContext(browser, 'a')
  const b = await createUserContext(browser, 'b')
  const customerResponse = await a.request.post('/api/customers', { data: { name: `E2E A ${Date.now()}`, email: `e2e-${Date.now()}@example.com`, phone: '1', status: 'active' }, headers: { Origin: appOrigin } })
  expect(customerResponse.status()).toBe(201)
  const customer = await customerResponse.json() as { id: string }
  const customerListA = await a.request.get('/api/customers')
  expect(customerListA.status()).toBe(200)
  expect((await customerListA.json() as Array<{ id: string }>).some((item) => item.id === customer.id)).toBe(true)
  const customerListB = await b.request.get('/api/customers')
  expect(customerListB.status()).toBe(200)
  expect((await customerListB.json() as Array<{ id: string }>).some((item) => item.id === customer.id)).toBe(false)
  expect((await b.request.patch(`/api/customers/${customer.id}`, { data: { name: 'forbidden' }, headers: { Origin: appOrigin } })).status()).toBe(404)
  expect((await b.request.delete(`/api/customers/${customer.id}`, { headers: { Origin: appOrigin } })).status()).toBe(404)
  expect(await (await b.request.get(`/api/customers/${customer.id}`)).status()).toBe(404)
  const dealResponse = await a.request.post('/api/deals', { data: { title: 'E2E deal', customerId: customer.id, amount: 1, status: 'open' }, headers: { Origin: appOrigin } })
  expect(dealResponse.status()).toBe(201)
  const deal = await dealResponse.json() as { id: string; customerId: string }
  expect(deal.customerId).toBe(customer.id)
  expect((await a.request.get(`/api/deals/${deal.id}`)).status()).toBe(200)
  expect((await b.request.get(`/api/deals/${deal.id}`)).status()).toBe(404)
  expect((await b.request.post('/api/deals', { data: { title: 'cross-user', customerId: customer.id, amount: 1, status: 'open' }, headers: { Origin: appOrigin } })).status()).toBe(404)
  const invoiceResponse = await a.request.post('/api/invoices', { data: { number: `E2E-${Date.now()}`, customerId: customer.id, amount: 1, issueDate: '2026-01-01', dueDate: '2026-01-02', status: 'draft' }, headers: { Origin: appOrigin } })
  expect(invoiceResponse.status()).toBe(201)
  const invoice = await invoiceResponse.json() as { id: string }
  expect((await a.request.get(`/api/invoices/${invoice.id}`)).status()).toBe(200)
  expect((await b.request.get(`/api/invoices/${invoice.id}`)).status()).toBe(404)
  expect((await a.request.patch(`/api/invoices/${invoice.id}`, { data: { status: 'paid' }, headers: { Origin: appOrigin } })).status()).toBe(409)
  expect((await a.request.patch(`/api/invoices/${invoice.id}`, { data: { status: 'sent' }, headers: { Origin: appOrigin } })).status()).toBe(200)
  expect((await a.request.patch(`/api/invoices/${invoice.id}`, { data: { status: 'paid' }, headers: { Origin: appOrigin } })).status()).toBe(200)
  const taskResponse = await a.request.post('/api/tasks', { data: { title: 'E2E task', description: 'isolation', status: 'TODO' }, headers: { Origin: appOrigin } })
  expect(taskResponse.status()).toBe(201)
  const task = await taskResponse.json() as { id: string }
  const taskListA = await a.request.get('/api/tasks')
  expect(taskListA.status()).toBe(200)
  expect((await taskListA.json() as Array<{ id: string }>).some((item) => item.id === task.id)).toBe(true)
  expect((await b.request.get('/api/tasks')).status()).toBe(200)
  expect((await b.request.patch(`/api/tasks/${task.id}`, { data: { status: 'DONE' }, headers: { Origin: appOrigin } })).status()).toBe(404)
  expect((await a.request.patch(`/api/tasks/${task.id}`, { data: { status: 'DONE' }, headers: { Origin: appOrigin } })).status()).toBe(200)
  expect((await a.request.delete(`/api/customers/${customer.id}`, { headers: { Origin: appOrigin } })).status()).toBe(409)
  await a.close(); await b.close()
})

test('keeps retry screen for auth outage and app shell for backend outage', async ({ browser }) => {
  const authContext = await createUserContext(browser, 'a')
  const authPage = await authContext.newPage()
  await authPage.route('**/auth/me', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }))
  await authPage.goto('/dashboard')
  await expect(authPage.getByText('認証サービスに接続できません。')).toBeVisible()
  expect(authPage.url()).toMatch(/\/dashboard$/)
  await authPage.unroute('**/auth/me')
  await authPage.getByRole('button', { name: '再試行' }).click()
  await expect(authPage.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()
  await authContext.close()

  const backendContext = await createUserContext(browser, 'a')
  const backendPage = await backendContext.newPage()
  await backendPage.route('**/api/customers', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }))
  await backendPage.goto('/customers')
  await expect(backendPage.getByText('顧客を読み込めませんでした。')).toBeVisible()
  expect(backendPage.url()).toMatch(/\/customers$/)
  await backendContext.close()
})


test('画面から顧客・案件・請求書を作成し、タスクを移動できる', async ({ browser }) => {
  const context = await createUserContext(browser, 'a')
  const page = await context.newPage()
  const suffix = `${Date.now()}`
  const customerName = `UI customer ${suffix}`
  const dealTitle = `UI deal ${suffix}`
  const invoiceNumber = `UI-${suffix}`
  const taskTitle = `UI task ${suffix}`
  const origins = new Set<string>()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) origins.add(url.origin)
  })
  try {
    await page.goto('/customers')
    await page.getByRole('button', { name: '新規顧客', exact: true }).click()
    await page.getByLabel('名前', { exact: true }).fill(customerName)
    await page.getByLabel('メールアドレス', { exact: true }).fill(`ui-${suffix}@example.com`)
    await page.getByLabel('電話番号', { exact: true }).fill('123')
    const customerResponse = page.waitForResponse((r) => r.url().endsWith('/api/customers') && r.request().method() === 'POST')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    const customer = await (await customerResponse).json() as { id: string }
    await page.getByRole('button', { name: `${customerName} の詳細を見る`, exact: true }).click()
    await expect(page.getByRole('heading', { name: customerName })).toBeVisible()

    await page.goto('/deals')
    await page.getByRole('button', { name: '新規案件', exact: true }).click()
    await page.getByLabel('タイトル', { exact: true }).fill(dealTitle)
    await page.getByRole('combobox', { name: '顧客', exact: true }).click()
    await page.getByRole('option', { name: customerName, exact: true }).click()
    await page.getByLabel('金額', { exact: true }).fill('100')
    const dealResponse = page.waitForResponse((r) => r.url().endsWith('/api/deals') && r.request().method() === 'POST')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    expect((await dealResponse).status()).toBe(201)
    await page.getByRole('button', { name: `${dealTitle} の詳細を見る`, exact: true }).click()
    await expect(page.getByRole('heading', { name: dealTitle })).toBeVisible()
    await expect(page.getByText(customerName, { exact: true })).toBeVisible()

    await page.goto('/invoices')
    await page.getByRole('button', { name: '新規請求書', exact: true }).click()
    await page.getByLabel('請求書番号', { exact: true }).fill(invoiceNumber)
    await page.getByLabel('顧客 ID', { exact: true }).fill(customer.id)
    await page.getByLabel('金額', { exact: true }).fill('100')
    await page.getByLabel('発行日', { exact: true }).fill('2026/01/01')
    await page.getByLabel('発行日', { exact: true }).press('Tab')
    await page.getByLabel('支払期日', { exact: true }).fill('2026/01/02')
    await page.getByLabel('支払期日', { exact: true }).press('Tab')
    const invoiceResponse = page.waitForResponse((r) => r.url().endsWith('/api/invoices') && r.request().method() === 'POST')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    expect((await invoiceResponse).status()).toBe(201)
    await page.getByRole('button', { name: `${invoiceNumber} の詳細を見る`, exact: true }).click()
    await page.getByRole('button', { name: '→ 送付済み', exact: true }).click()
    await page.getByRole('button', { name: '→ 支払済み', exact: true }).click()
    await expect(page.getByText('支払済み', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '編集', exact: true }).click()
    await page.getByRole('combobox', { name: 'ステータス', exact: true }).click()
    await page.getByRole('option', { name: 'キャンセル', exact: true }).click()
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await expect(page.getByText('キャンセル', { exact: true })).toBeVisible()

    await page.goto('/tasks')
    await page.getByRole('button', { name: '未着手にタスクを追加', exact: true }).click()
    await page.getByLabel('タイトル', { exact: true }).fill(taskTitle)
    await page.getByLabel('説明', { exact: true }).fill('Browser integration')
    const taskResponse = page.waitForResponse((r) => r.url().endsWith('/api/tasks') && r.request().method() === 'POST')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    const task = await (await taskResponse).json() as { id: string }
    await expect(page.getByRole('dialog')).not.toBeVisible()
    const handle = page.getByRole('button', { name: `${taskTitle} をドラッグ`, exact: true })
    const doneColumn = page.locator('.mantine-Paper-root').filter({ has: page.getByRole('heading', { name: '完了', exact: true }) })
    const target = doneColumn
    await handle.hover()
    const from = await handle.boundingBox()
    const to = await target.boundingBox()
    if (from === null || to === null) throw new Error('Kanban drag target is not visible')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 })
    await expect(page.getByText(taskTitle, { exact: true })).toHaveCount(2)
    const update = page.waitForResponse((r) => r.url().endsWith(`/api/tasks/${task.id}`) && r.request().method() === 'PATCH')
    await page.mouse.move(to.x + to.width / 2, to.y + 100, { steps: 20 })
    await expect(doneColumn).toBeVisible()
    await page.mouse.up()
    expect((await update).status()).toBe(200)
    await page.reload()
    await expect(doneColumn.getByText(taskTitle, { exact: true })).toBeVisible()
    expect([...origins]).toEqual([appOrigin])
  } finally {
    await context.close()
  }
})

test('業務APIの401でログインへ戻る', async ({ browser }) => {
  const context = await createUserContext(browser, 'a')
  const page = await context.newPage()
  try {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()
    await page.route('**/api/customers', (route) => route.fulfill({ status: 401, body: '{}' }))
    await page.goto('/customers')
    await expect(page).toHaveURL(`${appOrigin}/login`)
  } finally {
    await context.close()
  }
})

test('ログアウト失敗後に再試行でき、対象ユーザーのセッションだけを終了する', async ({ browser }) => {
  const a = await createUserContext(browser, 'a')
  const b = await createUserContext(browser, 'b')
  try {
    expect((await a.request.get('/auth/logout')).status()).toBe(405)
    expect((await a.request.post('/auth/logout', { headers: { Origin: 'http://other.localtest.me:5174' } })).status()).toBe(403)
    expect((await a.request.get('/auth/me')).status()).toBe(200)
    const page = await a.newPage()
    await page.goto('/dashboard')
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
