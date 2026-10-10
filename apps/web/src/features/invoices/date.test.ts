import { afterEach, describe, expect, it } from 'vitest'

import { formatInvoiceDate, toInvoiceDateString } from '@/features/invoices/date'

const runtimeEnv = (globalThis as typeof globalThis & {
  process: { env: Record<string, string | undefined> }
}).process.env
const originalTimezone = runtimeEnv.TZ

afterEach(() => {
  if (originalTimezone === undefined) {
    delete runtimeEnv.TZ
  } else {
    runtimeEnv.TZ = originalTimezone
  }
})

describe('invoice date helpers', () => {
  it.each(['America/Los_Angeles', 'Asia/Tokyo'])('preserves date-only values in %s', (timezone) => {
    runtimeEnv.TZ = timezone

    expect(toInvoiceDateString('2026-10-10')).toBe('2026-10-10')
    expect(toInvoiceDateString(null)).toBe('')
    expect(toInvoiceDateString('')).toBe('')
    expect(formatInvoiceDate('2026-10-10', 'yyyy-MM-dd')).toBe('2026-10-10')
    expect(formatInvoiceDate('2026-10-10', 'MMM d, yyyy')).toBe('Oct 10, 2026')
  })

  it('formats Date values using their local calendar date', () => {
    runtimeEnv.TZ = 'America/Los_Angeles'

    expect(toInvoiceDateString(new Date(2026, 9, 10))).toBe('2026-10-10')
  })
})
