import { fetchAsOrganization } from '@/test/organization'
import { describe, expect, it } from 'vitest'

describe('invoice handlers', () => {
  it('filters overdue sent invoices and includes the requested date boundary', async () => {
    const response = await fetchAsOrganization('http://localhost/api/invoices?overdue=true&today=2026-04-01&page=1&pageSize=20')
    const result = (await response.json()) as { items: { id: string }[] }
    expect(result.items.map((invoice) => invoice.id)).toEqual(['invoice-001'])
  })

  it('rejects a stale source status without updating any selected invoice', async () => {
    const response = await fetchAsOrganization('http://localhost/api/invoices/bulk-status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: ['invoice-001', 'invoice-003'], from: 'sent', to: 'paid' }),
    })
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ error: { details: { invoiceIds: ['invoice-003'] } } })

    const invoiceResponse = await fetchAsOrganization('http://localhost/api/invoices/invoice-001')
    await expect(invoiceResponse.json()).resolves.toMatchObject({ status: 'sent' })
  })

  it('rejects skipping invoice status transitions', async () => {
    const response = await fetchAsOrganization('http://localhost/api/invoices/invoice-003', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })

    expect(response.status).toBe(409)

    const invoiceResponse = await fetchAsOrganization('http://localhost/api/invoices/invoice-003')
    const invoice = (await invoiceResponse.json()) as { status: string }

    expect(invoice.status).toBe('draft')
  })
})
