import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import { routeTree } from '@/routeTree.gen'
import { useSessionStore } from '@/lib/stores/session.store'

function renderRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(<RouterProvider router={router} />)
  return router
}

function failOnce(method: 'post' | 'patch', path: string, successBody: object) {
  let failed = false
  server.use(
    http[method](`*/api/${path}`, () => {
      if (!failed) {
        failed = true
        return HttpResponse.json({ message: 'Temporary failure' }, { status: 500 })
      }
      return HttpResponse.json(successBody, { status: 200 })
    }),
  )
}

function deferRequest(method: 'post' | 'patch', path: string, status: number) {
  let startRequest!: () => void
  let finishRequest!: () => void
  let releaseResponse!: () => void
  const started = new Promise<void>((resolve) => { startRequest = resolve })
  const finished = new Promise<void>((resolve) => { finishRequest = resolve })
  const responseReleased = new Promise<void>((resolve) => { releaseResponse = resolve })
  server.use(
    http[method](`*/api/${path}`, async () => {
      startRequest()
      await responseReleased
      finishRequest()
      return status === 500
        ? HttpResponse.json({ message: 'Temporary failure' }, { status })
        : HttpResponse.json({ ok: true }, { status: 200 })
    }),
  )
  return { started, finished, releaseResponse }
}

const saveFlows = [
  { name: '顧客作成', route: '/customers', open: 'New Customer', method: 'post', endpoint: 'customers', field: 'Name', value: 'New Customer' },
  { name: '顧客編集', route: '/customers/customer-001', open: 'Edit', method: 'patch', endpoint: 'customers/customer-001', field: 'Name', value: 'Updated Customer' },
  { name: '案件作成', route: '/deals', open: 'New Deal', method: 'post', endpoint: 'deals', field: 'Title', value: 'New Deal' },
  { name: '案件編集', route: '/deals/deal-001', open: 'Edit', method: 'patch', endpoint: 'deals/deal-001', field: 'Title', value: 'Updated Deal' },
] as const

async function openAndFill(flow: (typeof saveFlows)[number]) {
  fireEvent.click(await screen.findByRole('button', { name: flow.open }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText(flow.field), { target: { value: flow.value } })
  if (flow.name === '顧客作成') {
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'new@example.com' } })
    fireEvent.change(within(dialog).getByLabelText('Phone'), { target: { value: '03-1234-0000' } })
  }
  if (flow.name === '案件作成') {
    fireEvent.click(within(dialog).getByLabelText('Customer'))
    fireEvent.click(await screen.findByText('Acme Corporation'))
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '2500' } })
  }
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
  return dialog
}

async function closeAndReopen(flow: (typeof saveFlows)[number]) {
  fireEvent.keyDown(document.body, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  fireEvent.click(await screen.findByRole('button', { name: flow.open }))
  return screen.findByRole('dialog')
}

async function verifyStaleResultIsIgnored(flow: (typeof saveFlows)[number], status: number) {
  const deferred = deferRequest(flow.method, flow.endpoint, status)
  await openAndFill(flow)
  await deferred.started
  const currentDialog = await closeAndReopen(flow)
  expect(within(currentDialog).queryByRole('alert')).toBeNull()
  deferred.releaseResponse()
  await deferred.finished
  await waitFor(() => {
    const saveButton = within(currentDialog).getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(saveButton.disabled).toBe(false)
  })
  expect(within(currentDialog).queryByRole('alert')).toBeNull()
  expect(screen.queryByRole('dialog')).toBe(currentDialog)
}

describe('顧客・案件の保存エラー表示', () => {
  beforeEach(() => {
    useSessionStore.getState().setSession({ id: 'test-user', name: 'Test', email: 'test@example.com' })
  })
  afterEach(() => useSessionStore.getState().clearSession())

  it('顧客作成の失敗を表示し、入力値を保って再試行できる', async () => {
    failOnce('post', 'customers', {
      id: 'customer-new', name: 'Acme', email: 'acme@example.com', phone: '03-1234-5678', status: 'active', createdAt: '2026-01-01',
    })
    renderRoute('/customers')
    fireEvent.click(await screen.findByRole('button', { name: 'New Customer' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Acme' } })
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'acme@example.com' } })
    fireEvent.change(within(dialog).getByLabelText('Phone'), { target: { value: '03-1234-5678' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect((await within(dialog).findByRole('alert')).textContent).toContain('Failed to save customer')
    expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Acme')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('顧客編集の失敗を表示し、再試行できる', async () => {
    failOnce('patch', 'customers/customer-001', {
      id: 'customer-001', name: 'Updated Acme', email: 'contact@acme.example', phone: '03-5555-0101', status: 'active', createdAt: '2026-01-01',
    })
    renderRoute('/customers/customer-001')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Updated Acme' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect((await within(dialog).findByRole('alert')).textContent).toContain('Failed to save customer')
    expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Updated Acme')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('案件作成の失敗を表示し、入力値を保って再試行できる', async () => {
    failOnce('post', 'deals', {
      id: 'deal-new', title: 'Renewal', customerId: 'customer-001', amount: 2500, status: 'open', createdAt: '2026-01-01',
    })
    renderRoute('/deals')
    fireEvent.click(await screen.findByRole('button', { name: 'New Deal' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Renewal' } })
    fireEvent.click(within(dialog).getByLabelText('Customer'))
    fireEvent.click(await screen.findByText('Acme Corporation'))
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '2500' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect((await within(dialog).findByRole('alert')).textContent).toContain('Failed to save deal')
    expect((within(dialog).getByLabelText('Title') as HTMLInputElement).value).toBe('Renewal')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('案件編集の失敗を表示し、再試行できる', async () => {
    failOnce('patch', 'deals/deal-001', {
      id: 'deal-001', title: 'Updated Renewal', customerId: 'customer-001', amount: 2500, status: 'open', createdAt: '2026-01-01',
    })
    renderRoute('/deals/deal-001')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Updated Renewal' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect((await within(dialog).findByRole('alert')).textContent).toContain('Failed to save deal')
    expect((within(dialog).getByLabelText('Title') as HTMLInputElement).value).toBe('Updated Renewal')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it.each(saveFlows)('$nameは閉じたフォームの保存結果で再open中のフォームを変更しない', async (flow) => {
    renderRoute(flow.route)
    await verifyStaleResultIsIgnored(flow, 500)
    await verifyStaleResultIsIgnored(flow, 200)
  })
})
