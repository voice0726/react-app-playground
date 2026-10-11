import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { parseSearchPreservingRawQuery } from '@/lib/searchParams'
import { useSessionStore } from '@/lib/stores/session.store'
import { routeTree } from '@/routeTree.gen'

function renderInvoices(entry: string) {
  useSessionStore.getState().setSession({ id: 'test-user', name: 'Test', email: 'test@example.com' })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [entry] }),
    parseSearch: parseSearchPreservingRawQuery,
  })
  render(<RouterProvider router={router} />)
}

function columnTexts(index: number) {
  return screen
    .queryAllByRole('row')
    .slice(1)
    .map((row) => within(row).queryAllByRole('cell')[index]?.textContent ?? '')
}

const toNumber = (text: string) => Number(text.replace(/[^\d]/g, ''))

describe('請求書一覧のソートと検索', () => {
  afterEach(() => useSessionStore.getState().clearSession())

  it('金額を昇順に並べる', async () => {
    renderInvoices('/invoices?sort=amount&order=asc')
    await waitFor(() => expect(columnTexts(2).length).toBeGreaterThan(1))
    const amounts = columnTexts(2).map(toNumber)
    expect(amounts).toEqual(amounts.toSorted((a, b) => a - b))
  })

  it('支払期日を降順に並べる', async () => {
    renderInvoices('/invoices?sort=dueDate&order=desc')
    await waitFor(() => expect(columnTexts(4).length).toBeGreaterThan(1))
    const dates = columnTexts(4)
    expect(dates).toEqual(dates.toSorted().toReversed())
  })

  it('請求書番号の検索語に合う請求書だけを表示する', async () => {
    renderInvoices('/invoices?q=INV-2026-0001')
    await waitFor(() => expect(columnTexts(0)).toEqual(['INV-2026-0001']))
  })

  it('検索語に合う請求書がなければ空表示にする', async () => {
    renderInvoices('/invoices?q=zzzz-no-such-invoice')
    expect(await screen.findByText(/見つかりません/)).toBeTruthy()
  })
})
