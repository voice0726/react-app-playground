import { http, HttpResponse } from 'msw'

import { invoices as seedInvoices, type Invoice, type InvoiceStatus } from '../data/seed'
import { createId, notFound, numberValue, readJsonObject, stringValue } from './utils'

let invoices: Invoice[] = [...seedInvoices]

function findInvoice(id: string): Invoice | undefined {
  return invoices.find((invoice) => invoice.id === id)
}

function invoiceStatus(value: unknown, fallback: InvoiceStatus): InvoiceStatus {
  const status = stringValue(value)

  if (status === 'draft' || status === 'sent' || status === 'paid' || status === 'cancelled') {
    return status
  }

  return fallback
}

export const invoiceHandlers = [
  http.get('*/api/invoices', () => HttpResponse.json(invoices)),
  http.get('*/api/invoices/:id', ({ params }) => {
    const id = stringValue(params.id)
    const invoice = id === undefined ? undefined : findInvoice(id)

    if (invoice === undefined) {
      return notFound('Invoice')
    }

    return HttpResponse.json(invoice)
  }),
  http.post('*/api/invoices', async ({ request }) => {
    const body = await readJsonObject(request)
    const invoice: Invoice = {
      id: createId('invoice', invoices.length),
      number: stringValue(body.number) ?? `INV-2026-${String(invoices.length + 1).padStart(4, '0')}`,
      customerId: stringValue(body.customerId) ?? 'customer-001',
      amount: numberValue(body.amount) ?? 0,
      issueDate: stringValue(body.issueDate) ?? '2026-03-01',
      dueDate: stringValue(body.dueDate) ?? '2026-03-31',
      status: invoiceStatus(body.status, 'draft'),
    }

    invoices = [...invoices, invoice]

    return HttpResponse.json(invoice, { status: 201 })
  }),
  http.patch('*/api/invoices/:id', async ({ params, request }) => {
    const id = stringValue(params.id)
    const invoice = id === undefined ? undefined : findInvoice(id)

    if (id === undefined || invoice === undefined) {
      return notFound('Invoice')
    }

    const body = await readJsonObject(request)
    const updated: Invoice = {
      ...invoice,
      number: stringValue(body.number) ?? invoice.number,
      customerId: stringValue(body.customerId) ?? invoice.customerId,
      amount: numberValue(body.amount) ?? invoice.amount,
      issueDate: stringValue(body.issueDate) ?? invoice.issueDate,
      dueDate: stringValue(body.dueDate) ?? invoice.dueDate,
      status: invoiceStatus(body.status, invoice.status),
    }

    invoices = invoices.map((item) => (item.id === id ? updated : item))

    return HttpResponse.json(updated)
  }),
]
