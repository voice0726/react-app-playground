import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/lib/stores/session.store'
import { routeTree } from '@/routeTree.gen'

const entries = [
  { entry: '/customers?q=123&sort=name&order=desc', search: { q: '123', sort: 'name', order: 'desc' } },
  { entry: '/deals?q=true&sort=title&order=asc', search: { q: 'true', sort: 'title', order: 'asc' } },
  { entry: '/customers?sort=email&order=desc', search: { sort: 'email', order: 'desc' } },
  { entry: '/deals?sort=amount&order=asc', search: { sort: 'amount', order: 'asc' } },
  { entry: '/customers?q=acme', search: { q: 'acme' } },
  { entry: '/customers?q=null', search: {} },
  { entry: '/deals?q=%5B%22abc%22%5D', search: {} },
  { entry: '/customers?q=%7B%22x%22%3A1%7D', search: {} },
  { entry: '/customers?q=acme&sort=%5B%22name%22%5D&order=sideways', search: { q: 'acme' } },
  { entry: '/deals?q=%5B%5D&sort=%7B%22id%22%3A1%7D&order=false', search: {} },
  { entry: '/customers?q=acme&sort=amount&order=desc', search: { q: 'acme', order: 'desc' } },
  { entry: '/deals?q=renewal&sort=email&order=asc', search: { q: 'renewal', order: 'asc' } },
] as const

describe('顧客・案件一覧の検索URL', () => {
  afterEach(() => useSessionStore.getState().clearSession())

  it.each(entries)('$entryを安全に正規化して一覧へ表示する', async ({ entry, search }) => {
    useSessionStore.getState().setSession({ id: 'test-user', name: 'Test', email: 'test@example.com' })
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [entry] }),
    })
    render(<RouterProvider router={router} />)

    await waitFor(() => expect(router.state.location.search).toEqual(search))
    const searchInput = (await screen.findByRole('textbox', { name: 'Search' })) as HTMLInputElement
    expect(searchInput.value).toBe(('q' in search ? search.q : undefined) ?? '')
  })
})
