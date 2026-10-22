import { format } from 'date-fns'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/lib/stores/session.store'
import { server } from '@/mocks/server'
import { routeTree } from '@/routeTree.gen'
import { MOCK_ORGANIZATION_ID } from '@/mocks/handlers/organizations'
import { dashboardKeys } from '@/types/queryKeys'
import type { DashboardSummary } from '@/types/dashboard.types'

const summary: DashboardSummary = {
  customers: 12,
  deals: 8,
  invoices: 5,
  tasks: 3,
  invoiceSummary: { draftCount: 2, outstandingAmount: 3000, overdueCount: 1, overdueAmount: 1000 },
}

function renderRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(<RouterProvider router={router} />)
}

beforeEach(() => {
  queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
  useSessionStore.getState().setSession({ id: '1', name: 'Test', email: 'test@example.com' })
  sessionStorage.removeItem('playground:organization:1')
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  useSessionStore.getState().clearSession()
})

describe('dashboard route', () => {
  it('keeps loaded cards visible during a background refetch', async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const queryKey = dashboardKeys.detail(MOCK_ORGANIZATION_ID, today)
    queryClient.setQueryData(queryKey, summary)

    let requestStarted!: () => void
    let releaseResponse!: () => void
    const started = new Promise<void>((resolve) => { requestStarted = resolve })
    const responseReleased = new Promise<void>((resolve) => { releaseResponse = resolve })
    server.use(http.get('*/api/dashboard', async () => {
      requestStarted()
      await responseReleased
      return HttpResponse.json(summary)
    }))

    renderRoute('/dashboard')
    expect(await screen.findByRole('heading', { name: 'ダッシュボード' })).toBeTruthy()
    expect((await screen.findAllByText('顧客', { exact: true })).length).toBeGreaterThan(1)
    const refetch = queryClient.refetchQueries({ queryKey })
    await started

    expect(screen.getAllByText('顧客', { exact: true }).length).toBeGreaterThan(1)
    expect(screen.getByRole('heading', { name: '12' })).toBeTruthy()
    expect(screen.queryByLabelText('業務データを読み込み中')).toBeNull()

    releaseResponse()
    await refetch
  })
})
