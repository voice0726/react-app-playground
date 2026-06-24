import { describe, expect, it } from 'vitest'

import { customers, deals, invoices, tasks } from './seed'
import type { CustomerStatus } from './seed'

describe('seed data', () => {
  it('contains the fixed Phase 2 data set sizes', () => {
    expect(customers).toHaveLength(10)
    expect(deals).toHaveLength(15)
    expect(invoices).toHaveLength(8)
    expect(tasks).toHaveLength(10)
  })

  it('re-exports the customer status type contract', () => {
    const status: CustomerStatus = 'active'

    expect(status).toBe('active')
  })
})
