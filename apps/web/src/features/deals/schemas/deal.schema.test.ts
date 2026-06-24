import { describe, expect, it } from 'vitest'

import { dealSchema } from './deal.schema'

describe('dealSchema', () => {
  it('accepts valid deal form values', () => {
    const result = dealSchema.safeParse({
      title: 'Acme renewal',
      customerId: 'customer-001',
      amount: 120000,
      status: 'open',
    })

    expect(result.success).toBe(true)
  })

  it('reports an invalid amount type', () => {
    const result = dealSchema.safeParse({
      title: 'Acme renewal',
      customerId: 'customer-001',
      amount: Number.NaN,
      status: 'open',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Amount must be a number')
  })
})
