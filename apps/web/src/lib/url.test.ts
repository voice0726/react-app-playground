import { describe, expect, it } from 'vitest'
import { toSearchParams, withQuery } from './url'

describe('toSearchParams', () => {
  it('converts primitive values to query string', () => {
    const params = toSearchParams({
      q: 'ticket',
      page: 2,
      archived: false,
    })

    expect(params.toString()).toBe('q=ticket&page=2&archived=false')
  })

  it('supports array values and skips nullish/empty values', () => {
    const params = toSearchParams({
      status: ['open', 'closed'],
      q: '',
      assignee: null,
      pageSize: undefined,
    })

    expect(params.toString()).toBe('status=open&status=closed')
  })
})

describe('withQuery', () => {
  it('returns path when query is not provided', () => {
    expect(withQuery('/api/tickets')).toBe('/api/tickets')
  })

  it('returns path with query string when query is provided', () => {
    expect(withQuery('/api/tickets', { q: 'abc', page: 1 })).toBe('/api/tickets?q=abc&page=1')
  })

  it('returns path when query becomes empty', () => {
    expect(withQuery('/api/tickets', { q: '', status: undefined })).toBe('/api/tickets')
  })
})
