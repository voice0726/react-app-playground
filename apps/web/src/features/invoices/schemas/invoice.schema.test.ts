import { describe, expect, it } from 'vitest'

import { invoiceSchema } from './invoice.schema'

const validInvoice = {
  number: 'INV-2026-9001',
  customerId: 'customer-001',
  amount: 120000,
  issueDate: '2026-03-01',
  dueDate: '2026-03-31',
  status: 'draft',
}

describe('invoiceSchema', () => {
  it('accepts valid invoice data', () => {
    const result = invoiceSchema.safeParse(validInvoice)

    expect(result.success).toBe(true)
  })

  it('rejects an empty invoice number', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      number: '',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('請求書番号を入力してください')
  })

  it('rejects a negative amount', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      amount: -1,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('金額は 0 より大きい値を入力してください')
  })
})
