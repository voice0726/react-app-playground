import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/lib/stores/session.store'
import { routeTree } from '@/routeTree.gen'

const entries = [
  ['/customers?q=123&sort=name&order=desc', { q: '123', sort: 'name', order: 'desc' }],
  ['/deals?q=true&sort=title&order=asc', { q: 'true', sort: 'title', order: 'asc' }],
  ['/customers?q=acme', { q: 'acme' }],
  ['/customers?q=null', {}],
  ['/deals?q=%5B%22abc%22%5D', {}],
  ['/customers?q=%7B%22x%22%3A1%7D', {}],
] as const

describe('顧客・案件一覧の検索URL', () => {
  afterEach(() => useSessionStore.getState().clearSession())

  it.each(entries)('%sを検索条件として読み込む', async (entry, expected) => {
    useSessionStore.getState().setSession({ id: 'test-user', name: 'Test', email: 'test@example.com' })
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [entry] }),
    })
    render(<RouterProvider router={router} />)

    await waitFor(() => expect(router.state.location.search).toMatchObject(expected))
  })
})
