import { describe, expect, it } from 'vitest'

import { buildListUrl, failedToRefresh, keepPreviousPage, outOfRangeLastPage, pageToShow, toListRequest } from './pagination'

function fetched(total: number) {
  return { data: { items: [], total, page: 3, pageSize: 10 }, isFetching: false, isPlaceholderData: false }
}

describe('一覧のページング条件', () => {
  it('URL の条件を既定値で補い、空白だけの検索語を送らない', () => {
    expect(toListRequest({ q: '  ' })).toEqual({ page: 1, pageSize: 10 })
    expect(toListRequest({ q: ' Acme ', page: 3, pageSize: 20 })).toEqual({ page: 3, pageSize: 20, q: 'Acme' })
  })

  it('並び順は列と向きがそろったときだけ送る', () => {
    expect(toListRequest({ sort: 'name' })).toEqual({ page: 1, pageSize: 10 })
    expect(toListRequest({ sort: 'name', order: 'desc' })).toMatchObject({ sort: 'name', order: 'desc' })
  })

  it('API の URL に条件を並べる', () => {
    expect(buildListUrl('/api/deals', { page: 2, pageSize: 20, q: 'CRM', sort: 'amount', order: 'asc' })).toBe(
      '/api/deals?page=2&pageSize=20&q=CRM&sort=amount&order=asc',
    )
  })

  it('取得済みの最終ページを越えたときだけ移動先を返す', () => {
    expect(outOfRangeLastPage(3, fetched(15))).toBe(2)
    expect(outOfRangeLastPage(2, fetched(15))).toBeUndefined()
    expect(outOfRangeLastPage(3, fetched(0))).toBe(1)
    expect(outOfRangeLastPage(3, { ...fetched(15), isFetching: true, isPlaceholderData: true })).toBeUndefined()
  })

  it('再取得中のキャッシュでは、件数が古い可能性があるので移動しない', () => {
    const stale = { data: { items: [], total: 10, page: 2, pageSize: 10 }, isFetching: true, isPlaceholderData: false }

    expect(outOfRangeLastPage(2, stale)).toBeUndefined()
  })

  it('取得に失敗した条件でも、空のページを返して一覧を残す', () => {
    const request = { page: 2, pageSize: 20, q: 'x' }

    expect(pageToShow(request, { data: undefined, isError: true })).toEqual({
      items: [],
      total: 0,
      page: 2,
      pageSize: 20,
    })
    expect(pageToShow(request, { data: undefined, isError: false })).toBeUndefined()
  })

  it('表示中の行があるまま失敗したときだけ、再取得の失敗とみなす', () => {
    const rows = { items: [{ id: 'a' }], total: 1, page: 1, pageSize: 10 }

    expect(failedToRefresh({ data: rows, isError: true })).toBe(true)
    expect(failedToRefresh({ data: { ...rows, items: [], total: 0 }, isError: true })).toBe(false)
    expect(failedToRefresh({ data: undefined, isError: true })).toBe(false)
    expect(failedToRefresh({ data: rows, isError: false })).toBe(false)
  })

  it('直前の条件が失敗していたら、次の取得中も空のページで一覧を残す', () => {
    const request = { page: 1, pageSize: 10 }
    const previous = { items: [], total: 3, page: 1, pageSize: 10 }

    expect(keepPreviousPage(request)(previous, { state: { status: 'success' } })).toBe(previous)
    expect(keepPreviousPage(request)(undefined, { state: { status: 'error' } })).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })
    expect(keepPreviousPage(request)(undefined, undefined)).toBeUndefined()
  })
})
