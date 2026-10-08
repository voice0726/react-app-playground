import { describe, expect, it } from 'vitest'
import { formatDateTime } from './date'

describe('formatDateTime', () => {
  it('formats ISO datetime with UTC offset', () => {
    expect(formatDateTime('2026-03-04T08:20:00Z')).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/)
  })

  it('returns original value when datetime is invalid', () => {
    expect(formatDateTime('invalid-datetime')).toBe('invalid-datetime')
  })
})
