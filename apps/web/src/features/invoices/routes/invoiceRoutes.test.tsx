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

async function waitForMutationStatus(status: 'error' | 'success') {
  await waitFor(() =>
    expect(queryClient.getMutationCache().getAll().some((mutation) => mutation.state.status === status)).toBe(
      true,
    ),
  )
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
      const oldRequest = new DeferredResponse()
      const newRequest = new DeferredResponse()
      let requestCount = 0
      server.use(
        http.post('*/api/invoices', async () => {
          const request = requestCount++ === 0 ? oldRequest : newRequest
          request.notifyStarted()
          return request.response
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
      await oldRequest.started

      const closeButton = screen.getByRole('dialog').querySelector('header button')
      expect(closeButton).not.toBeNull()
      fireEvent.click(closeButton as HTMLButtonElement)
      fireEvent.click(screen.getByRole('button', { name: 'New Invoice' }))
      expect(await screen.findByRole('dialog')).toBeTruthy()
      const saveButton = screen.getByRole('button', { name: 'Save' })
      expect(saveButton.hasAttribute('data-loading')).toBe(false)
      expect((saveButton as HTMLButtonElement).disabled).toBe(false)
      fireEvent.change(screen.getByLabelText('Invoice number'), { target: { value: 'INV-NEW' } })
      fireEvent.change(screen.getByLabelText('Customer ID'), { target: { value: 'customer-2' } })
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '200' } })
      fireEvent.change(screen.getByLabelText('Issue date'), { target: { value: '2026-10-11' } })
      fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-10-21' } })
      fireEvent.click(saveButton)
      await newRequest.started

      oldRequest.resolveResponse(
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
      await waitForMutationStatus(outcome === 'failure' ? 'error' : 'success')
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('data-loading')).toBe(true)
      expect(screen.queryByText('Failed to create invoice. Please try again.')).toBeNull()

      newRequest.resolveResponse(
        HttpResponse.json({
          id: 'invoice-new',
          number: 'INV-NEW',
          customerId: 'customer-2',
          amount: 200,
          issueDate: '2026-10-11',
          dueDate: '2026-10-21',
          status: 'draft',
        }),
      )
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
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

  it.each(['failure', 'success'] as const)(
    'does not restore a stale create form after leaving and returning (%s)',
    async (outcome) => {
      const deferred = new DeferredResponse()
      server.use(
        http.post('*/api/invoices', async () => {
          deferred.notifyStarted()
          return deferred.response
        }),
      )
      const router = renderRoute('/invoices')

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

      await router.navigate({ to: '/invoices/$invoiceId', params: { invoiceId: 'invoice-001' } })
      expect(await screen.findByRole('heading', { name: 'INV-2026-0001' })).toBeTruthy()
      await router.navigate({ to: '/invoices' })
      fireEvent.click(await screen.findByRole('button', { name: 'New Invoice' }))
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

  it.each(['status', 'invoiceId'] as const)(
    'ignores a late status failure after the displayed %s changes',
    async (changedValue) => {
      const oldRequest = new DeferredResponse()
      const newRequest = new DeferredResponse()
      let requestCount = 0
      server.use(
        http.patch('*/api/invoices/:id', async () => {
          const request = requestCount++ === 0 ? oldRequest : newRequest
          request.notifyStarted()
          return request.response
        }),
      )
      const router = renderRoute('/invoices/invoice-001')
      fireEvent.click(await screen.findByRole('button', { name: '→ paid' }))
      await oldRequest.started

      if (changedValue === 'status') {
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
      } else {
        await router.navigate({ to: '/invoices/$invoiceId', params: { invoiceId: 'invoice-003' } })
        expect(await screen.findByRole('button', { name: '→ sent' })).toBeTruthy()
      }

      const newTransition = screen.getByRole('button', { name: '→ sent' })
      expect((newTransition as HTMLButtonElement).disabled).toBe(false)
      fireEvent.click(newTransition)
      await newRequest.started
      expect(screen.getByRole('button', { name: '→ sent' }).hasAttribute('data-loading')).toBe(true)

      oldRequest.resolveResponse(
        HttpResponse.json({ message: 'Old request failed' }, { status: 500 }),
      )
      await waitForMutationStatus('error')
      expect(screen.getByRole('button', { name: '→ sent' }).hasAttribute('data-loading')).toBe(true)
      expect(screen.queryByText('Failed to update invoice status. Please try again.')).toBeNull()

      newRequest.resolveResponse(
        HttpResponse.json({
          id: changedValue === 'invoiceId' ? 'invoice-003' : 'invoice-001',
          number: changedValue === 'invoiceId' ? 'INV-2026-0003' : 'INV-2026-0001',
          customerId: changedValue === 'invoiceId' ? 'customer-004' : 'customer-001',
          amount: changedValue === 'invoiceId' ? 450000 : 1200000,
          issueDate: changedValue === 'invoiceId' ? '2026-03-03' : '2026-03-01',
          dueDate: changedValue === 'invoiceId' ? '2026-04-02' : '2026-03-31',
          status: 'sent',
        }),
      )
      await waitForMutationStatus('success')
      const nextStatus = changedValue === 'invoiceId' ? 'sent' : 'paid'
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: `→ ${nextStatus}` }).hasAttribute('data-loading'),
        ).toBe(false),
      )

      expect(screen.queryByText('Failed to update invoice status. Please try again.')).toBeNull()
    },
  )
})
