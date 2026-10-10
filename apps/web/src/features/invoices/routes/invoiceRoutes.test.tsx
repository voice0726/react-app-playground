import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { queryClient } from '@/lib/queryClient'
import { invoiceKeys } from '@/features/invoices/api/queries'
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

class DeferredResponse {
  response: Promise<Response>
  started: Promise<void>
  resolveResponse: (response: Response) => void = () => {}
  notifyStarted: () => void = () => {}

  constructor() {
    this.response = new Promise((resolve) => {
      this.resolveResponse = resolve
    })
    this.started = new Promise((resolve) => {
      this.notifyStarted = resolve
    })
  }
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

  it.each(['failure', 'success'] as const)(
    'ignores a late %s from a closed create form after reopening',
    async (outcome) => {
      const deferred = new DeferredResponse()
      server.use(
        http.post('*/api/invoices', async () => {
          deferred.notifyStarted()
          return deferred.response
        }),
      )
      renderRoute('/invoices')

      fireEvent.click(await screen.findByRole('button', { name: 'New Invoice' }))
      fireEvent.change(await screen.findByLabelText('Invoice number'), {
        target: { value: 'INV-OLD' },
      })
      fireEvent.change(screen.getByLabelText('Customer ID'), { target: { value: 'customer-1' } })
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } })
      fireEvent.change(screen.getByLabelText('Issue date'), { target: { value: '2026-10-10' } })
      fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-10-20' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await deferred.started

      const closeButton = screen.getByRole('dialog').querySelector('header button')
      expect(closeButton).not.toBeNull()
      fireEvent.click(closeButton as HTMLButtonElement)
      fireEvent.click(screen.getByRole('button', { name: 'New Invoice' }))
      expect(await screen.findByRole('dialog')).toBeTruthy()

      deferred.resolveResponse(
        outcome === 'failure'
          ? HttpResponse.json({ message: 'Old request failed' }, { status: 500 })
          : HttpResponse.json({
              id: 'invoice-old',
              number: 'INV-OLD',
              customerId: 'customer-1',
              amount: 100,
              issueDate: '2026-10-10',
              dueDate: '2026-10-20',
              status: 'draft',
            }),
      )
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('data-loading')).toBe(
          false,
        ),
      )

      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(screen.queryByText('Failed to create invoice. Please try again.')).toBeNull()
    },
  )

  it.each(['failure', 'success'] as const)(
    'ignores a late %s from a closed edit form after reopening',
    async (outcome) => {
      const deferred = new DeferredResponse()
      server.use(
        http.patch('*/api/invoices/:id', async () => {
          deferred.notifyStarted()
          return deferred.response
        }),
      )
      renderRoute('/invoices/invoice-001')

      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
      await deferred.started

      const closeButton = screen.getByRole('dialog').querySelector('header button')
      expect(closeButton).not.toBeNull()
      fireEvent.click(closeButton as HTMLButtonElement)
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      expect(await screen.findByRole('dialog')).toBeTruthy()

      deferred.resolveResponse(
        outcome === 'failure'
          ? HttpResponse.json({ message: 'Old request failed' }, { status: 500 })
          : HttpResponse.json({
              id: 'invoice-001',
              number: 'INV-2026-0001',
              customerId: 'customer-001',
              amount: 1200000,
              issueDate: '2026-03-01',
              dueDate: '2026-03-31',
              status: 'sent',
            }),
      )
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('data-loading')).toBe(
          false,
        ),
      )

      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(screen.queryByText('Failed to update invoice. Please try again.')).toBeNull()
    },
  )

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

  it('clears a status error when the displayed invoice changes', async () => {
    server.use(
      http.patch('*/api/invoices/:id', () =>
        HttpResponse.json({ message: 'Temporary failure' }, { status: 500 }),
      ),
    )
    const router = renderRoute('/invoices/invoice-001')

    const transition = await screen.findByRole('button', { name: '→ paid' })
    fireEvent.click(transition)
    expect(await screen.findByText('Failed to update invoice status. Please try again.')).toBeTruthy()

    queryClient.setQueryData(invoiceKeys.detail('invoice-001'), {
      id: 'invoice-001',
      number: 'INV-2026-0001',
      customerId: 'customer-001',
      amount: 1200000,
      issueDate: '2026-03-01',
      dueDate: '2026-03-31',
      status: 'draft',
    })
    expect(await screen.findByRole('button', { name: '→ sent' })).toBeTruthy()
    expect(screen.queryByText('Failed to update invoice status. Please try again.')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '→ sent' }))
    expect(await screen.findByText('Failed to update invoice status. Please try again.')).toBeTruthy()
    await router.navigate({ to: '/invoices/$invoiceId', params: { invoiceId: 'invoice-003' } })

    expect(await screen.findByRole('button', { name: '→ sent' })).toBeTruthy()
    expect(screen.queryByText('Failed to update invoice status. Please try again.')).toBeNull()
  })
})
