import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { parseSearchPreservingRawQuery } from '@/lib/searchParams'
import { useSessionStore } from '@/lib/stores/session.store'
import { routeTree } from '@/routeTree.gen'

function renderCustomers(entry: string) {
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

describe('顧客一覧のソートと検索', () => {
  afterEach(() => useSessionStore.getState().clearSession())

  it('名前を昇順に並べる', async () => {
    renderCustomers('/customers?sort=name&order=asc')
    await waitFor(() => expect(columnTexts(0).length).toBeGreaterThan(1))
    const names = columnTexts(0)
    expect(names).toEqual(names.toSorted())
  })

  it('メールアドレスを降順に並べる', async () => {
    renderCustomers('/customers?sort=email&order=desc')
    await waitFor(() => expect(columnTexts(1).length).toBeGreaterThan(1))
    const emails = columnTexts(1)
    expect(emails).toEqual(emails.toSorted().toReversed())
  })

  it('名前の検索語に合う顧客だけを表示する', async () => {
    renderCustomers('/customers?q=northstar')
    await waitFor(() => expect(columnTexts(0)).toEqual(['Northstar Systems']))
  })

  it('メールアドレスの検索語に合う顧客だけを表示する', async () => {
    renderCustomers('/customers?q=billing%40acme')
    await waitFor(() => expect(columnTexts(0)).toEqual(['Acme Corporation']))
  })

  it('検索語に合う顧客がなければ空表示にする', async () => {
    renderCustomers('/customers?q=zzzz-no-such-customer')
    expect(await screen.findByText(/見つかりません/)).toBeTruthy()
  })
})
