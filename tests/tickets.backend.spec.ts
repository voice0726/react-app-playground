import { expect, test } from '@playwright/test'
import { appOrigin, createUserContext } from './helpers/auth'

test('チケットはユーザー間で分離され、コメントはAPIで操作できる', async ({ browser }) => {
  const a = await createUserContext(browser, 'a')
  const b = await createUserContext(browser, 'b')
  try {
    const headers = { Origin: appOrigin }
    const title = `E2E ticket ${Date.now()}`
    const created = await a.request.post('/api/tickets', { data: { title, status: 'open', assignee: null }, headers })
    expect(created.status()).toBe(201)
    const ticket = await created.json() as { id: number; title: string }
    expect(ticket.title).toBe(title)

    const listA = await a.request.get(`/api/tickets?q=${encodeURIComponent(title)}`)
    expect(listA.status()).toBe(200)
    expect((await listA.json() as { items: Array<{ id: number }> }).items.some((item) => item.id === ticket.id)).toBe(true)
    const listB = await b.request.get(`/api/tickets?q=${encodeURIComponent(title)}`)
    expect(listB.status()).toBe(200)
    expect((await listB.json() as { items: Array<{ id: number }> }).items.some((item) => item.id === ticket.id)).toBe(false)
    expect((await b.request.get(`/api/tickets/${ticket.id}`)).status()).toBe(404)
    expect((await b.request.put(`/api/tickets/${ticket.id}`, { data: { title: 'forbidden', status: 'closed', assignee: null }, headers })).status()).toBe(404)
    expect((await b.request.post(`/api/tickets/${ticket.id}/comments`, { data: { body: 'forbidden' }, headers })).status()).toBe(404)
    expect((await b.request.delete(`/api/tickets/${ticket.id}`, { headers })).status()).toBe(404)

    const updated = await a.request.put(`/api/tickets/${ticket.id}`, { data: { title: `${title} updated`, status: 'closed', assignee: 'e2e' }, headers })
    expect(updated.status()).toBe(200)
    const detail = await updated.json() as { status: string; history: { items: unknown[] } }
    expect(detail.status).toBe('closed')
    expect(detail.history.items.length).toBeGreaterThan(0)

    const commented = await a.request.post(`/api/tickets/${ticket.id}/comments`, { data: { body: 'first comment' }, headers })
    expect(commented.status()).toBe(201)
    const withComment = await commented.json() as { comments: { items: Array<{ id: number; body: string }> } }
    const comment = withComment.comments.items.find((item) => item.body === 'first comment')
    expect(comment).toBeDefined()
    const edited = await a.request.put(`/api/tickets/${ticket.id}/comments/${comment?.id}`, { data: { body: 'edited comment' }, headers })
    expect(edited.status()).toBe(200)
    expect((await b.request.put(`/api/tickets/${ticket.id}/comments/${comment?.id}`, { data: { body: 'forbidden' }, headers })).status()).toBe(404)
    expect((await a.request.delete(`/api/tickets/${ticket.id}/comments/${comment?.id}`, { headers })).status()).toBe(200)

    expect((await a.request.post('/api/tickets', { data: { title: '   ', status: 'open', assignee: null }, headers })).status()).toBe(400)
    expect((await a.request.delete(`/api/tickets/${ticket.id}`, { headers })).status()).toBe(204)
    expect((await a.request.get(`/api/tickets/${ticket.id}`)).status()).toBe(404)
  } finally {
    await a.close()
    await b.close()
  }
})

test('画面からチケットを作成・コメント・編集・削除できる', async ({ browser }) => {
  const context = await createUserContext(browser, 'a')
  const page = await context.newPage()
  const suffix = `${Date.now()}`
  const title = `UI ticket ${suffix}`
  try {
    await page.goto('/tickets/new')
    await page.getByLabel('タイトル', { exact: true }).fill(title)
    const createResponse = page.waitForResponse((r) => r.url().endsWith('/api/tickets') && r.request().method() === 'POST')
    await page.getByRole('button', { name: '作成する', exact: true }).click()
    const ticket = await (await createResponse).json() as { id: number }
    await expect(page.getByRole('heading', { name: `チケット #${ticket.id}` })).toBeVisible()
    await expect(page.getByText(title, { exact: true })).toBeVisible()

    await page.getByLabel('コメントを追加').fill('UI comment')
    await page.getByRole('button', { name: '投稿する', exact: true }).click()
    await expect(page.getByText('UI comment', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: '編集', exact: true }).first().click()
    await page.getByLabel('タイトル', { exact: true }).fill(`${title} updated`)
    await page.getByRole('button', { name: '更新する', exact: true }).click()
    await expect(page.getByText(`${title} updated`, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: '削除', exact: true }).first().click()
    await page.getByRole('button', { name: '削除する', exact: true }).click()
    await expect(page).toHaveURL(`${appOrigin}/tickets`)
    expect((await context.request.get(`/api/tickets/${ticket.id}`)).status()).toBe(404)
  } finally {
    await context.close()
  }
})
