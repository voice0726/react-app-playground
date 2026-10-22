import { describe, expect, it } from 'vitest'
import { MOCK_EDITOR_ORGANIZATION_ID, MOCK_ORGANIZATION_ID, MOCK_VIEWER_ORGANIZATION_ID } from './organizations'

const send = (path: string, id = MOCK_ORGANIZATION_ID, init: RequestInit = {}) =>
  fetch(`http://localhost/api${path}`, { ...init, headers: { 'content-type': 'application/json', 'X-Organization-ID': id, ...init.headers } })

describe('組織ごとの認可とデータ分離', () => {
  it('組織ヘッダの欠落と組織外アクセスを拒否する', async () => {
    expect((await fetch('http://localhost/api/tickets')).status).toBe(400)
    expect((await send('/customers', '00000000-0000-4000-8000-000000000099')).status).toBe(404)
  })

  it.each(['/customers', '/deals', '/invoices', '/tasks', '/tickets'])('閲覧者による %s の更新を拒否する', async (path) => {
    expect((await send(path, MOCK_VIEWER_ORGANIZATION_ID, { method: 'POST', body: '{}' })).status).toBe(403)
    expect((await send(path, MOCK_VIEWER_ORGANIZATION_ID)).status).toBe(200)
  })

  it('編集者はチケットを共有編集でき、メンバー管理はできない', async () => {
    const response = await send('/tickets', MOCK_EDITOR_ORGANIZATION_ID, { method: 'POST', body: JSON.stringify({ title: '共有チケット', status: 'open', assignee: null }) })
    expect(response.status).toBe(201)
    expect((await send(`/organizations/${MOCK_EDITOR_ORGANIZATION_ID}/members`, MOCK_EDITOR_ORGANIZATION_ID, { method: 'POST', body: JSON.stringify({ userId: 'new-member', role: 'viewer' }) })).status).toBe(403)
  })

  it('新しい組織に既存組織のデータと集計を引き継がない', async () => {
    const created = await (await send('/organizations', MOCK_ORGANIZATION_ID, { method: 'POST', body: JSON.stringify({ name: '新規組織' }) })).json() as { id: string }
    expect(await (await send('/tickets', created.id)).json()).toMatchObject({ items: [], total: 0 })
    expect((await send('/customers/customer-001', created.id)).status).toBe(404)
    expect(await (await send('/dashboard?today=2026-10-22', created.id)).json()).toEqual({ customers: 0, deals: 0, invoices: 0, tasks: 0, invoiceSummary: { draftCount: 0, outstandingAmount: 0, overdueCount: 0, overdueAmount: 0 } })
    expect(await (await send('/invoices/summary?today=2026-10-22', created.id)).json()).toEqual({ draftCount: 0, outstandingAmount: 0, overdueCount: 0, overdueAmount: 0 })
    expect((await send('/tickets/1')).status).toBe(200)
  })

  it('最後の管理者の削除と降格を拒否する', async () => {
    const path = `/organizations/${MOCK_ORGANIZATION_ID}/members/1`
    expect((await send(path, MOCK_ORGANIZATION_ID, { method: 'DELETE' })).status).toBe(409)
    expect((await send(path, MOCK_ORGANIZATION_ID, { method: 'PATCH', body: JSON.stringify({ role: 'viewer' }) })).status).toBe(409)
  })
})

it.each([MOCK_ORGANIZATION_ID, MOCK_EDITOR_ORGANIZATION_ID, MOCK_VIEWER_ORGANIZATION_ID])('所属メンバーは一覧を取得でき、変更は管理者に限る（%s）', async (id) => {
  const response = await send(`/organizations/${id}/members`, id)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(expect.arrayContaining([expect.objectContaining({ userId: '1' })]))
  if (id === MOCK_ORGANIZATION_ID) return
  const memberPath = `/organizations/${id}/members/2`
  expect((await send(memberPath, id, { method: 'PATCH', body: JSON.stringify({ role: 'viewer' }) })).status).toBe(403)
  expect((await send(memberPath, id, { method: 'DELETE' })).status).toBe(403)
})

it('組織外からメンバー一覧を取得できない', async () => {
  expect((await send('/organizations/00000000-0000-4000-8000-000000000099/members')).status).toBe(404)
})
