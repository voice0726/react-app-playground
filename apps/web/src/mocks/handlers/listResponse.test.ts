import { describe, expect, it } from 'vitest'

type Page = { items: { title: string; amount: number }[]; total: number; page: number; pageSize: number }

describe('一覧 API のモック', () => {
  it('page と pageSize があれば件数付きのページを返す', async () => {
    const response = await fetch('http://localhost/api/deals?page=2&pageSize=4&sort=amount&order=desc')
    const body = (await response.json()) as Page

    expect(body).toMatchObject({ total: 15, page: 2, pageSize: 4 })
    expect(body.items).toHaveLength(4)
    const amounts = body.items.map((item) => item.amount)
    expect(amounts).toEqual(amounts.toSorted((a, b) => b - a))
  })

  it('検索語で絞り込んだ件数を total に返す', async () => {
    const response = await fetch('http://localhost/api/invoices?page=1&pageSize=10&q=inv-2026-0001')
    const body = (await response.json()) as Page

    expect(body.total).toBe(1)
  })

  it('page と pageSize が無ければ配列を返す', async () => {
    const response = await fetch('http://localhost/api/customers')

    expect(Array.isArray(await response.json())).toBe(true)
  })

  it.each([
    'page=1&pageSize=10&sort=unknown',
    'page=1&pageSize=10&order=up',
    'page=0&pageSize=10',
    'page=1&pageSize=101',
  ])('許可しない条件 %s は 400 にする', async (query) => {
    const response = await fetch(`http://localhost/api/customers?${query}`)

    expect(response.status).toBe(400)
  })
})
