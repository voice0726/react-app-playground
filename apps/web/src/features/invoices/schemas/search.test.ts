import { describe, expect, it } from 'vitest'

import { invoiceSearchSchema } from '@/features/invoices/schemas/search'

describe('invoiceSearchSchema', () => {
  it.each([
    [{ q: 'invoice' }, { q: 'invoice' }],
    [{ q: 123 }, { q: '123' }],
    [{ q: true }, { q: 'true' }],
    [{ q: null }, {}],
    [{ q: ['invoice'] }, {}],
    [{ q: { value: 'invoice' } }, {}],
    [{ q: 'invoice', order: 'invalid' }, { q: 'invoice' }],
    [{ sort: 'amount', order: 'desc' }, { sort: 'amount', order: 'desc' }],
    [{ sort: 'dueDate', order: 'asc' }, { sort: 'dueDate', order: 'asc' }],
    [{ sort: 'unknown', order: 'asc', q: 'invoice' }, { q: 'invoice' }],
    [{ sort: ['amount'], order: 'desc' }, {}],
    [{ sort: 123, order: 'desc' }, {}],
  ])('normalizes %j to %j', (input, expected) => {
    expect(invoiceSearchSchema.parse(input)).toEqual(expected)
  })
})
