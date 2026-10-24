import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'
import { appOrigin, createUserContext } from './helpers/auth'
import { addMember, changeMemberRole, createOrganization, organizationHeaders, selectOrganization, userIdOf } from './helpers/organization'
import type { Organization } from './helpers/organization'

test.setTimeout(60_000)

type Invoice = { id: string; number: string; status: string }

async function createCustomer(context: BrowserContext, organization: Organization) {
  const response = await context.request.post('/api/customers', {
    headers: organizationHeaders(organization),
    data: { name: '共有顧客', email: 'shared@example.test', phone: '000', status: 'active' },
  })
  expect(response.status()).toBe(201)
  return await response.json() as { id: string }
}

async function createInvoice(context: BrowserContext, organization: Organization, customerId: string, number: string, status: 'draft' | 'sent') {
  const response = await context.request.post('/api/invoices', {
    headers: organizationHeaders(organization),
    data: { number, customerId, amount: 1000, issueDate: '2026-01-01', dueDate: '2026-01-31', status },
  })
  expect(response.status()).toBe(201)
  return await response.json() as Invoice
}

test('組織の共有データを閲覧者は参照でき、編集者は更新できる', async ({ browser }) => {
  const a = await createUserContext(browser, 'a')
  const b = await createUserContext(browser, 'b')
  try {
    const shared = await createOrganization(a, 'E2E 共有')
    const privateOrg = await createOrganization(b, 'E2E 非共有')
    const headers = organizationHeaders(shared)
    const customer = await createCustomer(a, shared)
    const bUserId = await userIdOf(b)
    const aUserId = await userIdOf(a)

    expect((await b.request.get('/api/customers?page=1&pageSize=10', { headers })).status()).toBe(404)
    const privateList = await b.request.get('/api/customers?page=1&pageSize=10', { headers: organizationHeaders(privateOrg) })
    expect(privateList.status()).toBe(200)
    expect(await privateList.json()).toMatchObject({ total: 0, items: [] })
    await addMember(a, shared, bUserId, 'viewer')

    const page = await b.newPage()
    await selectOrganization(page, shared)
    await page.goto('/customers')
    await expect(page.getByRole('cell', { name: '共有顧客', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '新規顧客', exact: true })).toBeDisabled()
    expect((await b.request.patch(`/api/customers/${customer.id}`, { headers, data: { name: '拒否対象' } })).status()).toBe(403)

    const deal = await a.request.post('/api/deals', { headers, data: { title: '共有案件', customerId: customer.id, amount: 1, status: 'open' } })
    expect(deal.status()).toBe(201)
    const dealId = (await deal.json() as { id: string }).id
    const invoice = await createInvoice(a, shared, customer.id, 'SHARED-001', 'draft')
    const task = await a.request.post('/api/tasks', { headers, data: { title: '共有タスク', description: '', status: 'TODO' } })
    expect(task.status()).toBe(201)
    const taskId = (await task.json() as { id: string }).id
    const ticket = await a.request.post('/api/tickets', { headers, data: { title: '共有チケット', status: 'open', assignee: null } })
    expect(ticket.status()).toBe(201)
    const ticketId = (await ticket.json() as { id: number }).id

    for (const path of ['/api/deals', '/api/invoices', '/api/tasks', '/api/tickets', '/api/dashboard', '/api/invoices/summary']) {
      expect((await b.request.get(path, { headers })).status()).toBe(200)
    }
    expect((await b.request.patch(`/api/deals/${dealId}`, { headers, data: { title: '拒否対象' } })).status()).toBe(403)
    expect((await b.request.patch(`/api/invoices/${invoice.id}`, { headers, data: { status: 'sent' } })).status()).toBe(403)
    expect((await b.request.post('/api/invoices/bulk-status', { headers, data: { ids: [invoice.id], from: 'draft', to: 'sent' } })).status()).toBe(403)
    expect((await b.request.patch(`/api/tasks/${taskId}`, { headers, data: { status: 'DONE' } })).status()).toBe(403)
    expect((await b.request.put(`/api/tickets/${ticketId}`, { headers, data: { title: '拒否対象', status: 'closed', assignee: null } })).status()).toBe(403)
    expect((await b.request.post(`/api/tickets/${ticketId}/comments`, { headers, data: { body: '拒否対象' } })).status()).toBe(403)

    await changeMemberRole(a, shared, bUserId, 'editor')
    await page.reload()
    await expect(page.getByText('権限: 編集者', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '新規顧客', exact: true }).click()
    await page.getByLabel('名前', { exact: true }).fill('編集者の顧客')
    await page.getByLabel('メールアドレス', { exact: true }).fill('editor@example.test')
    await page.getByLabel('電話番号', { exact: true }).fill('001')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await expect(page.getByRole('cell', { name: '編集者の顧客', exact: true })).toBeVisible()
    const sharedList = await a.request.get('/api/customers?page=1&pageSize=10', { headers })
    expect(sharedList.status()).toBe(200)
    expect(await sharedList.json()).toMatchObject({ total: 2, items: expect.arrayContaining([expect.objectContaining({ name: '編集者の顧客' })]) })

    const updated = await b.request.patch(`/api/customers/${customer.id}`, { headers, data: { name: '編集者が更新した共有顧客' } })
    expect(updated.status()).toBe(200)
    const detail = await a.request.get(`/api/customers/${customer.id}`, { headers })
    expect(detail.status()).toBe(200)
    expect(await detail.json()).toMatchObject({ name: '編集者が更新した共有顧客' })
    await page.getByRole('link', { name: '組織と権限', exact: true }).click()
    await expect(page.getByText('メンバーの管理は管理者のみ操作できます。')).toBeVisible()
    expect((await b.request.patch(`/api/organizations/${shared.id}/members/${encodeURIComponent(aUserId)}`, { headers: { Origin: appOrigin }, data: { role: 'viewer' } })).status()).toBe(403)
    expect((await b.request.post(`/api/organizations/${shared.id}/members`, { headers: { Origin: appOrigin }, data: { userId: aUserId, role: 'admin' } })).status()).toBe(403)

    await selectOrganization(page, privateOrg)
    await page.goto('/customers')
    await expect(page.getByText('顧客が見つかりません。', { exact: true })).toBeVisible()
    await selectOrganization(page, shared)
    await page.goto('/customers')
    await expect(page.getByRole('cell', { name: '編集者が更新した共有顧客', exact: true })).toBeVisible()
  } finally {
    await a.close()
    await b.close()
  }
})

test('請求書のサーバーページングと一括変更が組織の集計に反映される', async ({ browser }) => {
  const context = await createUserContext(browser, 'a')
  try {
    const organization = await createOrganization(context, 'E2E ページングと一括変更')
    const headers = organizationHeaders(organization)
    const customer = await createCustomer(context, organization)
    const invoices = await Promise.all(Array.from({ length: 12 }, (_, index) =>
      createInvoice(context, organization, customer.id, `LIVE-${String(index + 1).padStart(3, '0')}`, 'sent'),
    ))
    const apiPage = await context.request.get('/api/invoices?page=2&pageSize=10&sort=number&order=asc', { headers })
    expect(apiPage.status()).toBe(200)
    expect(await apiPage.json()).toMatchObject({ total: 12, page: 2, pageSize: 10, totalAmount: 12000, items: [{ number: 'LIVE-011' }, { number: 'LIVE-012' }] })

    const page = await context.newPage()
    await selectOrganization(page, organization)
    await page.goto('/invoices?pageSize=10&sort=number&order=asc')
    await expect(page.getByText('12 件中 1〜10 件', { exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'LIVE-001', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '次のページ', exact: true }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByText('12 件中 11〜12 件', { exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'LIVE-001', exact: true })).toHaveCount(0)
    await page.getByLabel('LIVE-011 を選択', { exact: true }).check()
    await page.getByLabel('LIVE-012 を選択', { exact: true }).check()
    await page.getByRole('button', { name: '入金済みにする', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('2 件を入金済みに変更します')

    const bulkResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/invoices/bulk-status' && response.request().method() === 'POST')
    await page.getByRole('button', { name: '変更する', exact: true }).click()
    const response = await bulkResponse
    expect(response.status()).toBe(200)
    expect(response.request().postDataJSON()).toEqual({ ids: [invoices[10]?.id, invoices[11]?.id], from: 'sent', to: 'paid' })
    expect(await response.json()).toMatchObject({ items: [{ status: 'paid' }, { status: 'paid' }] })
    await expect(page.getByRole('status')).toContainText('2 件を入金済みに変更しました。')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByLabel('LIVE-011 を選択', { exact: true })).not.toBeChecked()
    await page.reload()
    for (const number of ['LIVE-011', 'LIVE-012']) {
      await expect(page.getByRole('row').filter({ hasText: number }).getByText('支払済み', { exact: true })).toBeVisible()
    }

    const summary = await context.request.get('/api/invoices/summary?today=2026-09-06', { headers })
    expect(summary.status()).toBe(200)
    expect(await summary.json()).toMatchObject({ outstandingAmount: 10000, overdueCount: 10, overdueAmount: 10000 })
    const dashboard = await context.request.get('/api/dashboard?today=2026-09-06', { headers })
    expect(dashboard.status()).toBe(200)
    expect(await dashboard.json()).toMatchObject({ customers: 1, invoices: 12, invoiceSummary: { outstandingAmount: 10000, overdueCount: 10 } })
  } finally {
    await context.close()
  }
})

test('一括変更の競合では全件を維持し、最新の状態から選び直せる', async ({ browser }) => {
  const context = await createUserContext(browser, 'a')
  try {
    const organization = await createOrganization(context, 'E2E 一括変更の競合')
    const headers = organizationHeaders(organization)
    const customer = await createCustomer(context, organization)
    const first = await createInvoice(context, organization, customer.id, 'CONFLICT-001', 'draft')
    const second = await createInvoice(context, organization, customer.id, 'CONFLICT-002', 'draft')
    const page = await context.newPage()
    await selectOrganization(page, organization)
    await page.goto('/invoices?sort=number&order=asc')
    await page.getByLabel('CONFLICT-001 を選択', { exact: true }).check()
    await page.getByLabel('CONFLICT-002 を選択', { exact: true }).check()
    await page.getByRole('button', { name: '送付済みにする', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    expect((await context.request.patch(`/api/invoices/${second.id}`, { headers, data: { status: 'sent' } })).status()).toBe(200)
    const conflict = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/invoices/bulk-status' && response.request().method() === 'POST')
    await page.getByRole('button', { name: '変更する', exact: true }).click()
    const response = await conflict
    expect(response.status()).toBe(409)
    expect(await response.json()).toMatchObject({ error: { code: 'invoice_status_conflict', details: { invoiceIds: [second.id] } } })
    await expect(page.getByRole('alert')).toContainText('状態が変更されている請求書があります')
    for (const number of [first.number, second.number]) {
      await expect(page.getByLabel(`${number} を選択`, { exact: true })).not.toBeChecked()
    }
    const unchanged = await context.request.get(`/api/invoices/${first.id}`, { headers })
    expect(unchanged.status()).toBe(200)
    expect(await unchanged.json()).toMatchObject({ status: 'draft' })
    await expect(page.getByRole('row').filter({ hasText: second.number }).getByText('送付済み', { exact: true })).toBeVisible()

    await page.getByLabel(`${first.number} を選択`, { exact: true }).check()
    await page.getByRole('button', { name: '送付済みにする', exact: true }).click()
    await page.getByRole('button', { name: '変更する', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('1 件を送付済みに変更しました。')
    const updated = await context.request.get(`/api/invoices/${first.id}`, { headers })
    expect(updated.status()).toBe(200)
    expect(await updated.json()).toMatchObject({ status: 'sent' })
  } finally {
    await context.close()
  }
})
