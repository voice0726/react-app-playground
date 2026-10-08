import { describe, expect, it } from 'vitest'
import {
  TICKETS_SEARCH_DEFAULT,
  TICKETS_SEARCH_MAX_PAGE,
  TICKETS_SEARCH_MAX_PAGE_SIZE,
  ticketsSearchSchema,
} from './search'

describe('validateAndNormalizeSearch', () => {
  it('passes and normalize valid URL params', () => {
    const result = ticketsSearchSchema.parse({
      q: 'bug',
      status: 'closed',
      sortBy: 'id',
      sortOrder: 'dsc',
      page: '3',
      pageSize: '50',
    })

    expect(result).toEqual({
      q: 'bug',
      status: 'closed',
      sortBy: 'id',
      sortOrder: 'dsc',
      page: 3,
      pageSize: 50,
    })
  })

  it('accepts sortBy and sortOrder options', () => {
    const asc = ticketsSearchSchema.parse({ sortBy: 'id', sortOrder: 'asc' })
    const dsc = ticketsSearchSchema.parse({ sortBy: 'updated_at', sortOrder: 'dsc' })

    expect(asc.sortBy).toBe('id')
    expect(asc.sortOrder).toBe('asc')
    expect(dsc.sortBy).toBe('updated_at')
    expect(dsc.sortOrder).toBe('dsc')
  })

  it('trims whitespace from q param', () => {
    const result = ticketsSearchSchema.parse({
      q: '  bug  ',
    })
    expect(result.q).toBe('bug')
  })

  it('fills defaults when params are omitted', () => {
    const result = ticketsSearchSchema.parse({})

    expect(result).toEqual(TICKETS_SEARCH_DEFAULT)
  })

  it('falls back to defaults for invalid enum params', () => {
    const result = ticketsSearchSchema.parse({
      status: 'in_progress',
      sortBy: 'priority',
      sortOrder: 'desc',
    })

    expect(result).toEqual(TICKETS_SEARCH_DEFAULT)
  })

  it('falls back to defaults for invalid numeric params', () => {
    const result = ticketsSearchSchema.parse({
      page: 'abc',
      pageSize: 'def',
    })

    expect(result).toEqual(TICKETS_SEARCH_DEFAULT)
  })

  it('accepts numeric params at the upper bounds', () => {
    const result = ticketsSearchSchema.parse({
      page: TICKETS_SEARCH_MAX_PAGE,
      pageSize: TICKETS_SEARCH_MAX_PAGE_SIZE,
    })

    expect(result.page).toBe(TICKETS_SEARCH_MAX_PAGE)
    expect(result.pageSize).toBe(TICKETS_SEARCH_MAX_PAGE_SIZE)
  })

  it('falls back to defaults when numeric params exceed the upper bounds', () => {
    const result = ticketsSearchSchema.parse({
      page: '1000001',
      pageSize: '101',
    })

    expect(result).toEqual(TICKETS_SEARCH_DEFAULT)
  })

  it('falls back to defaults when numeric params are below min', () => {
    const result = ticketsSearchSchema.parse({
      page: '0',
      pageSize: '-5',
    })

    expect(result).toEqual(TICKETS_SEARCH_DEFAULT)
  })

  it('falls back to defaults when numeric params are not integers', () => {
    const result = ticketsSearchSchema.parse({
      page: '1.5',
      pageSize: '2.2',
    })

    expect(result).toEqual(TICKETS_SEARCH_DEFAULT)
  })
})
