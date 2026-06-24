import { describe, expect, it } from 'vitest'

import { getNextStatus } from './index'

describe('getNextStatus', () => {
  it('advances invoice statuses until a terminal state', () => {
    expect(getNextStatus('draft')).toBe('sent')
    expect(getNextStatus('sent')).toBe('paid')
    expect(getNextStatus('paid')).toBeNull()
    expect(getNextStatus('cancelled')).toBeNull()
  })
})
