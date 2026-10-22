import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  return router
}

function rowCount() {
  return screen.queryAllByRole('row').length - 1
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

describe('案件一覧のページング', () => {
  afterEach(() => useSessionStore.getState().clearSession())

  it('既定の10件ずつ表示し、2ページ目へ移ると残りを表示する', async () => {
    const router = renderDeals('/deals')
    await waitFor(() => expect(rowCount()).toBe(10))
    expect(screen.getByText('15 件中 1〜10 件')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '2 ページ目' }))
    await waitFor(() => expect(rowCount()).toBe(5))
    expect(screen.getByText('15 件中 11〜15 件')).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ page: 2 })
  })

  it('並び順を変えると1ページ目に戻る', async () => {
    const router = renderDeals('/deals?page=2')
    await waitFor(() => expect(rowCount()).toBe(5))

    fireEvent.click(screen.getByRole('button', { name: '金額' }))
    await waitFor(() => expect(rowCount()).toBe(10))
    expect(router.state.location.search).not.toHaveProperty('page')
    expect(router.state.location.search).toMatchObject({ sort: 'amount' })
  })

  it('表示件数を URL から復元する', async () => {
    renderDeals('/deals?pageSize=20')
    await waitFor(() => expect(rowCount()).toBe(15))
    expect(screen.getByText('15 件中 1〜15 件')).toBeTruthy()
  })

  it('許可外の表示件数は既定の10件にする', async () => {
    renderDeals('/deals?pageSize=7')
    await waitFor(() => expect(rowCount()).toBe(10))
  })

  it('範囲外のページを指定すると最終ページへ移る', async () => {
    const router = renderDeals('/deals?page=9')
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 2 }))
    await waitFor(() => expect(rowCount()).toBe(5))
  })
})
