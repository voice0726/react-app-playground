import { describe, expect, it } from 'vitest'

import { buildListUrl, outOfRangeLastPage, toListRequest } from './pagination'

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
    expect(outOfRangeLastPage(3, { total: 15, pageSize: 10 }, false)).toBe(2)
    expect(outOfRangeLastPage(2, { total: 15, pageSize: 10 }, false)).toBeUndefined()
    expect(outOfRangeLastPage(3, { total: 0, pageSize: 10 }, false)).toBe(1)
    expect(outOfRangeLastPage(3, { total: 15, pageSize: 10 }, true)).toBeUndefined()
  })
})
