import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/lib/stores/session.store'
import { invoices } from '@/mocks/data/seed'
import { server } from '@/mocks/server'
import { routeTree } from '@/routeTree.gen'

function renderInvoices() {
  useSessionStore.getState().setSession({ id: 'test-user', name: 'Test', email: 'test@example.com' })
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/invoices'] }) })
  render(<RouterProvider router={router} />)
}

afterEach(() => useSessionStore.getState().clearSession())

describe('一括変更に失敗した後の一覧', () => {
  it.each([404, 409, 500])('%i の応答に応じて一覧と選択を更新する', async (status) => {
    queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
    const invoice = invoices.find((item) => item.id === 'invoice-003')!
    let failed = false
    let listRequests = 0
    server.use(
      http.get('*/api/invoices', () => {
        listRequests += 1
        let items = [invoice]
        if (failed && status === 404) items = []
        if (failed && status === 409) items = [{ ...invoice, status: 'sent' }]
        return HttpResponse.json({ items, total: items.length, page: 1, pageSize: 10 })
      }),
      http.post('*/api/invoices/bulk-status', () => {
        failed = true
        return HttpResponse.json({ error: { details: { invoiceIds: [invoice.id] } } }, { status })
      }),
    )
    renderInvoices()
    fireEvent.click(await screen.findByLabelText('INV-2026-0003 を選択'))
    fireEvent.click(screen.getByRole('button', { name: '送付済みにする' }))
    const dialog = await screen.findByRole('dialog')
    const requestsBefore = listRequests
    fireEvent.click(within(dialog).getByRole('button', { name: '変更する' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(invoice.id)

    if (status === 500) {
      expect(alert.textContent).toContain('一括変更できませんでした')
      expect(screen.getByLabelText('INV-2026-0003 を選択')).toHaveProperty('checked', true)
      expect(listRequests).toBe(requestsBefore)
      return
    }
    await waitFor(() => expect(listRequests).toBeGreaterThan(requestsBefore))
    expect(screen.queryByText('1 件選択中')).toBeNull()
    if (status === 404) {
      expect(alert.textContent).toContain('請求書が見つかりません')
      await waitFor(() => expect(screen.queryByLabelText('INV-2026-0003 を選択')).toBeNull())
      return
    }
    expect(alert.textContent).toContain('状態が変更されている請求書があります')
    await waitFor(() => expect(screen.getByLabelText('INV-2026-0003 を選択')).toHaveProperty('checked', false))
    expect(await screen.findByText('送付済み', { exact: true })).toBeTruthy()
  })
})
