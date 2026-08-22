import { describe, expect, it } from 'vitest'

describe('invoice handlers', () => {
  it('rejects skipping invoice status transitions', async () => {
    const response = await fetch('http://localhost/api/invoices/invoice-003', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })

    expect(response.status).toBe(409)

    const invoiceResponse = await fetch('http://localhost/api/invoices/invoice-003')
    const invoice = (await invoiceResponse.json()) as { status: string }

    expect(invoice.status).toBe('draft')
  })
})
