import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/lib/stores/session.store'
import { server } from '@/mocks/server'
import { routeTree } from '@/routeTree.gen'

const renderRoute = (entry: string) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [entry] }),
  })

  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
  useSessionStore.getState().setSession({
    id: 'invoice-test-user',
    name: 'Invoice Test',
    email: 'invoice@example.com',
  })
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  useSessionStore.getState().clearSession()
})

describe('invoice routes', () => {
  it('keeps the create form open after failure and closes it after retry succeeds', async () => {
    server.use(
      http.post('*/api/invoices', () =>
        HttpResponse.json({ message: 'Temporary failure' }, { status: 500 }),
      ),
    )
    renderRoute('/invoices')

    fireEvent.click(await screen.findByRole('button', { name: 'New Invoice' }))
    fireEvent.change(await screen.findByLabelText('Invoice number'), { target: { value: 'INV-TEST' } })
    fireEvent.change(screen.getByLabelText('Customer ID'), { target: { value: 'customer-1' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Issue date'), { target: { value: '2026-10-10' } })
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-10-20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Failed to create invoice. Please try again.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()

    server.use(
      http.post('*/api/invoices', () =>
        HttpResponse.json({
          id: 'invoice-created',
          number: 'INV-TEST',
          customerId: 'customer-1',
          amount: 100,
          issueDate: '2026-10-10',
          dueDate: '2026-10-20',
          status: 'draft',
        }),
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByText('Failed to create invoice. Please try again.')).toBeNull()
  })

  it('accepts numeric search params without a route error', async () => {
    renderRoute('/invoices?q=123&order=invalid')

    expect(await screen.findByRole('heading', { name: 'Invoices' })).toBeTruthy()
    await waitFor(() => expect(screen.queryByText(/Search params/)).toBeNull())
  })

  it('shows the same issue date in the invoice list', async () => {
    renderRoute('/invoices?q=INV-2026-0001')

    expect(await screen.findByText('Mar 1, 2026')).toBeTruthy()
  })

  it('shows a retryable error when editing an invoice fails', async () => {
    server.use(
      http.patch('*/api/invoices/:id', () =>
        HttpResponse.json({ message: 'Temporary failure' }, { status: 500 }),
      ),
    )
    renderRoute('/invoices/invoice-001')

    expect(await screen.findByText('Mar 1, 2026')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Failed to update invoice. Please try again.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()

    server.use(
      http.patch('*/api/invoices/:id', () =>
        HttpResponse.json({
          id: 'invoice-001',
          number: 'INV-2026-0001',
          customerId: 'customer-001',
          amount: 1200000,
          issueDate: '2026-03-01',
          dueDate: '2026-03-31',
          status: 'sent',
        }),
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByText('Failed to update invoice. Please try again.')).toBeNull()
  })

  it('shows a retryable error when changing invoice status fails', async () => {
    server.use(
      http.patch('*/api/invoices/:id', () =>
        HttpResponse.json({ message: 'Temporary failure' }, { status: 500 }),
      ),
    )
    renderRoute('/invoices/invoice-001')

    const transition = await screen.findByRole('button', { name: '→ paid' })
    fireEvent.click(transition)
    expect(await screen.findByText('Failed to update invoice status. Please try again.')).toBeTruthy()

    server.use(
      http.patch('*/api/invoices/:id', () =>
        HttpResponse.json({
          id: 'invoice-001',
          number: 'INV-2026-0001',
          customerId: 'customer-001',
          amount: 1200000,
          issueDate: '2026-03-01',
          dueDate: '2026-03-31',
          status: 'paid',
        }),
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: '→ paid' }))

    await waitFor(() =>
      expect(screen.queryByText('Failed to update invoice status. Please try again.')).toBeNull(),
    )
  })
})
