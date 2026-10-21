import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { queryClient } from '@/lib/queryClient'
import { server } from '@/mocks/server'
import { routeTree } from '@/routeTree.gen'
import { customers as seedCustomers } from '@/mocks/data/seed'
import { useSessionStore } from '@/lib/stores/session.store'
import type { Customer } from '@/types/customer.types'

function renderCustomers(entry = '/customers') {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [entry] }),
  })

  render(<RouterProvider router={router} />)
  return router
}

function setupCustomerApi(initialCustomers: Customer[], onDelete: (id: string) => Promise<Response> | Response) {
  let customers = initialCustomers
  let listRequests = 0
  const deleteRequests: string[] = []
  server.use(
    http.get('*/api/customers', ({ request }) => {
      listRequests += 1
      const params = new URL(request.url).searchParams
      const page = Number(params.get('page'))
      const pageSize = Number(params.get('pageSize'))
      const start = (page - 1) * pageSize
      return HttpResponse.json({ items: customers.slice(start, start + pageSize), total: customers.length, page, pageSize })
    }),
    http.delete('*/api/customers/:id', async ({ params }) => {
      const id = String(params.id)
      deleteRequests.push(id)
      const response = await onDelete(id)
      if (response.ok) {
        customers = customers.filter((customer) => customer.id !== id)
      }
      return response
    }),
  )
  return { deleteRequests, getListRequests: () => listRequests }
}

beforeEach(() => {
  queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
  useSessionStore.getState().setSession({ id: 'user-1', name: 'Test User', email: 'test@example.com' })
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  useSessionStore.getState().clearSession()
})

describe('顧客一覧の削除確認', () => {
  it('キャンセルとEscapeでは削除しない', async () => {
    const api = setupCustomerApi(seedCustomers.slice(0, 2), () => HttpResponse.json({ success: true }))
    renderCustomers()
    await screen.findByText('Acme Corporation')

    fireEvent.click(screen.getByRole('button', { name: 'Acme Corporation を削除' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('Acme Corporation')
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Acme Corporation を削除' }))
    const escapeDialog = await screen.findByRole('dialog')
    fireEvent.keyDown(escapeDialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(api.deleteRequests).toEqual([])
  })

  it('確認後に一度だけ削除し、一覧を再取得する', async () => {
    const api = setupCustomerApi(seedCustomers.slice(0, 2), async () => {
      await delay(100)
      return HttpResponse.json({ success: true })
    })
    renderCustomers()
    await screen.findByText('Acme Corporation')

    fireEvent.click(screen.getByRole('button', { name: 'Acme Corporation を削除' }))
    const dialog = await screen.findByRole('dialog')
    const confirmButton = screen.getByRole('button', { name: '削除する' })
    fireEvent.click(confirmButton)
    fireEvent.click(confirmButton)
    await waitFor(() => expect(api.deleteRequests).toEqual(['customer-001']))
    expect(confirmButton.hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'キャンセル' }).hasAttribute('disabled')).toBe(true)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()

    await waitFor(() => expect(screen.queryByText('Acme Corporation')).toBeNull())
    expect(api.getListRequests()).toBeGreaterThan(1)
    expect(api.deleteRequests).toEqual(['customer-001'])
  })

  it('削除成功後も閉じるアニメーション中は確認対象名を表示する', async () => {
    setupCustomerApi(seedCustomers.slice(0, 2), () => HttpResponse.json({ success: true }))
    renderCustomers()
    await screen.findByText('Acme Corporation')

    fireEvent.click(screen.getByRole('button', { name: 'Acme Corporation を削除' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '削除する' }))

    const confirmationText = 'Acme Corporation を削除します。この操作は取り消せません。'
    await waitFor(() => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
      expect(dialog?.style.opacity).toBe('0')
    })
    expect(screen.queryByText(confirmationText)).not.toBeNull()
    await waitFor(() => expect(screen.queryByText(confirmationText)).toBeNull())
  })

  it('失敗を表示して再試行でき、別の顧客を選ぶと古いエラーを消す', async () => {
    let attempt = 0
    const api = setupCustomerApi(seedCustomers.slice(0, 3), () => {
      attempt += 1
      return attempt === 1
        ? new HttpResponse(null, { status: 503 })
        : HttpResponse.json({ success: true })
    })
    renderCustomers()
    await screen.findByText('Acme Corporation')

    fireEvent.click(screen.getByRole('button', { name: 'Acme Corporation を削除' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '削除する' }))
    expect((await screen.findByRole('alert')).textContent).toContain('顧客を削除できませんでした')
    expect(screen.getByRole('dialog').textContent).toContain('Acme Corporation')

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Northstar Systems を削除' }))
    const nextDialog = await screen.findByRole('dialog')
    expect(nextDialog.textContent).toContain('Northstar Systems')
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Acme Corporation を削除' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(api.deleteRequests).toEqual(['customer-001', 'customer-001'])
    await waitFor(() => expect(screen.queryByText('Acme Corporation')).toBeNull())

  })

  it('最終ページの最後の1件を削除すると、残っている最終ページへ移る', async () => {
    const extraCustomer: Customer = {
      id: 'customer-011',
      name: 'Last Page Customer',
      email: 'last-page@example.com',
      phone: '03-0000-0011',
      status: 'active',
      createdAt: '2026-12-31T00:00:00.000Z',
    }
    setupCustomerApi([...seedCustomers, extraCustomer], () => HttpResponse.json({ success: true }))
    const router = renderCustomers('/customers?page=2')
    await screen.findByText('Last Page Customer')

    fireEvent.click(screen.getByRole('button', { name: 'Last Page Customer を削除' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '削除する' }))

    await screen.findByText('Acme Corporation')
    expect(router.state.location.search).not.toHaveProperty('page')
    expect(screen.queryByText('Last Page Customer')).toBeNull()
  })
})

describe('顧客一覧の取得失敗', () => {
  it('行が無いまま失敗したら、空表示ではなくエラーを一覧の中に出す', async () => {
    server.use(http.get('*/api/customers', () => HttpResponse.json({ message: 'failed' }, { status: 500 })))
    renderCustomers()

    const error = await screen.findByRole('alert')
    expect(error.textContent).toBe('顧客を読み込めませんでした。')
    expect(error.closest('tbody')).not.toBeNull()
    expect(screen.queryByText('顧客が見つかりません。')).toBeNull()
    expect(screen.getByLabelText('検索')).toBeTruthy()
  })

  it('表示中の行を残したまま再取得に失敗したら、一覧の外で伝える', async () => {
    let failing = false
    server.use(
      http.get('*/api/customers', () =>
        failing
          ? HttpResponse.json({ message: 'failed' }, { status: 500 })
          : HttpResponse.json({ items: seedCustomers, total: seedCustomers.length, page: 1, pageSize: 10 }),
      ),
    )
    renderCustomers()
    await screen.findByText('Acme Corporation')

    failing = true
    await queryClient.refetchQueries()

    expect(await screen.findByText('顧客の一覧を更新できませんでした。前回読み込んだ内容を表示しています。')).toBeTruthy()
    expect(screen.getByText('Acme Corporation')).toBeTruthy()
    expect(screen.queryByText('顧客を読み込めませんでした。')).toBeNull()
  })
})
