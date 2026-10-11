import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { parseSearchPreservingRawQuery } from '@/lib/searchParams'
import { useSessionStore } from '@/lib/stores/session.store'
import { routeTree } from '@/routeTree.gen'

function renderDeals(entry: string) {
  useSessionStore.getState().setSession({ id: 'test-user', name: 'Test', email: 'test@example.com' })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [entry] }),
    parseSearch: parseSearchPreservingRawQuery,
  })
  render(<RouterProvider router={router} />)
}

function amounts() {
  return screen
    .queryAllByRole('row')
    .slice(1)
    .map((row) => Number(within(row).queryAllByRole('cell')[2]?.textContent?.replace(/[^\d]/g, '')))
}

describe('案件一覧のソートと検索', () => {
  afterEach(() => useSessionStore.getState().clearSession())

  it('金額を昇順に並べる', async () => {
    renderDeals('/deals?sort=amount&order=asc')
    await waitFor(() => expect(amounts().length).toBeGreaterThan(1))
    const values = amounts()
    expect(values).toEqual(values.toSorted((a, b) => a - b))
  })

  it('金額を降順に並べる', async () => {
    renderDeals('/deals?sort=amount&order=desc')
    await waitFor(() => expect(amounts().length).toBeGreaterThan(1))
    const values = amounts()
    expect(values).toEqual(values.toSorted((a, b) => b - a))
  })

  it('検索語に合わない案件を除く', async () => {
    renderDeals('/deals?q=zzzz-no-such-deal')
    expect(await screen.findByText('案件が見つかりません。')).toBeTruthy()
  })
})
