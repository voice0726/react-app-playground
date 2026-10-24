import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useInvoiceBulkActions } from '@/features/invoices/hooks/useInvoiceBulkActions'
import type { Invoice } from '@/features/invoices/types'
import { ApiError } from '@/lib/apiClient'
import { invoices } from '@/mocks/data/seed'

const api = vi.hoisted(() => ({ mutateAsync: vi.fn() }))
vi.mock('@/features/invoices/api/mutations', () => ({
  useBulkInvoiceStatus: () => ({ mutateAsync: api.mutateAsync, isPending: false }),
}))

describe('一覧を再訪した後の一括変更結果', () => {
  it.each([200, 404, 409, 500])('%i の古い完了結果を同じ条件の再訪先へ反映しない', async (status) => {
    let resolve!: (value: { items: Invoice[] }) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<{ items: Invoice[] }>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    const pending = { promise, resolve, reject }
    api.mutateAsync.mockReturnValueOnce(pending.promise)
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result, rerender } = renderHook(({ viewKey }) => useInvoiceBulkActions(viewKey, invoices), {
      initialProps: { viewKey: 'A' }, wrapper,
    })
    act(() => result.current.setSelected('invoice-003', true))
    act(() => result.current.openConfirmation())
    let completion: Promise<void> = Promise.resolve()
    act(() => { completion = result.current.confirm() })

    rerender({ viewKey: 'B' })
    rerender({ viewKey: 'A' })
    act(() => result.current.setSelected('invoice-007', true))
    await act(async () => {
      if (status === 200) pending.resolve({ items: [invoices[2]!] })
      else pending.reject(new ApiError(status, 'Delayed failure'))
      await completion
    })

    expect(result.current.result).toBeUndefined()
    expect([...result.current.selectedIds]).toEqual(['invoice-007'])
    expect(result.current.confirmation).toBeNull()
    queryClient.clear()
  })
})
