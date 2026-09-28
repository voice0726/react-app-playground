import { describe, expect, it } from 'vitest'
import { getInvoiceTotal, pureInvoicePreview } from './semanticReviewSample'

describe('invoice summary', () => {
  it('adds invoice line amounts', () => {
    expect(getInvoiceTotal([{ id: 'a', amount: 120 }, { id: 'b', amount: 80 }])).toBe(200)
  })

  it('previews invoice lines by amount', () => {
    const lines = [{ id: 'a', amount: 120 }, { id: 'b', amount: 80 }]
    expect(pureInvoicePreview(lines)).toEqual(['b: 80', 'a: 120'])
  })
})
